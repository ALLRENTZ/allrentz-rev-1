$ErrorActionPreference = 'Stop'

$runningContainers = @(docker ps --filter 'status=running' --format '{{.Names}}|{{.Image}}')
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to inspect running local Docker containers.'
}

$candidates = @(
  foreach ($runningContainer in $runningContainers) {
    $fields = $runningContainer -split '\\|', 2
    if ($fields.Count -eq 2 -and
        $fields[0] -match '^supabase_db_.+$' -and
        $fields[1] -match '(^|[./])supabase/postgres(?::|@|$)') {
      $fields[0]
    }
  }
)

if ($candidates.Count -ne 1) {
  throw "Expected exactly one running disposable local Supabase database container; found $($candidates.Count)."
}

$container = $candidates[0]
$isRunning = docker inspect --format '{{.State.Running}}' $container 2>$null
if ($LASTEXITCODE -ne 0 -or ($isRunning -join '').Trim() -ne 'true') {
  throw 'The selected disposable local Supabase database container is not running.'
}

function Invoke-LocalPsql {
  param([Parameter(Mandatory)][string]$Sql)

  $output = $Sql | docker exec -i $container psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -At 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw ($output -join [Environment]::NewLine)
  }

  return $output
}

$setup = @'
INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-4000-8000-000000000107',
  'authenticated',
  'authenticated',
  'clock-concurrency-admin@example.test',
  '{}'::jsonb,
  '{"full_name":"Clock Concurrency Admin","role":"customer"}'::jsonb,
  now(),
  now()
);

DELETE FROM public.user_roles
WHERE user_id = '00000000-0000-4000-8000-000000000107';

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-4000-8000-000000000107', 'admin');
'@

$callTemplate = @'
SELECT public.publish_rental_stop_rule_version(
  '00000000-0000-4000-8000-000000000107',
  'test.concurrent.rule',
  'Concurrent test rule',
  'platform',
  NULL,
  NULL,
  'request_received',
  'exact_timestamp',
  'postgres.exact_timestamp',
  1,
  '766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb',
  '{}'::jsonb,
  'accepted_contract',
  'concurrency-fixture',
  repeat('c', 64),
  now(),
  NULL,
  false,
  '__IDEMPOTENCY__',
  NULL
);
'@

$testFailure = $null

try {
  Invoke-LocalPsql -Sql $setup | Out-Null

  $calls = @(
    $callTemplate.Replace('__IDEMPOTENCY__', 'concurrent-rule-command-0001'),
    $callTemplate.Replace('__IDEMPOTENCY__', 'concurrent-rule-command-0002')
  )

  $jobs = foreach ($call in $calls) {
    Start-Job -ScriptBlock {
      param($Container, $Sql)
      $result = $Sql | docker exec -i $Container psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -At 2>&1
      [pscustomobject]@{
        ExitCode = $LASTEXITCODE
        Output = ($result -join [Environment]::NewLine)
      }
    } -ArgumentList $container, $call
  }

  $results = $jobs | Wait-Job | Receive-Job
  $jobs | Remove-Job -Force

  $successes = @($results | Where-Object {
      $_.ExitCode -eq 0 -and $_.Output -match '"rule_version"\s*:\s*1'
    })
  $conflicts = @($results | Where-Object {
      $_.ExitCode -ne 0 -and $_.Output -match 'Rule predecessor conflict for test.concurrent.rule'
    })

  if ($successes.Count -ne 1 -or $conflicts.Count -ne 1) {
    $details = $results | ConvertTo-Json -Depth 4
    throw "Expected one serialized publication and one predecessor conflict. Results: $details"
  }

  $state = Invoke-LocalPsql -Sql @'
SELECT jsonb_build_object(
  'rule_count', count(*),
  'minimum_version', min(version),
  'maximum_version', max(version),
  'audit_count', count(DISTINCT audit_event_id)
)
FROM public.rental_stop_rule_versions
WHERE rule_code = 'test.concurrent.rule';
'@

  $verified = $state | ConvertFrom-Json
  if ($verified.rule_count -ne 1 -or
      $verified.minimum_version -ne 1 -or
      $verified.maximum_version -ne 1 -or
      $verified.audit_count -ne 1) {
    throw "Concurrent publication left an invalid version or audit state: $state"
  }

  Write-Output 'PASS: concurrent rule publication serialized to one version and one atomic audit event.'
}
catch {
  $testFailure = $_
}
finally {
  supabase db reset --local --no-seed | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw 'Concurrency verification cleanup failed: local database reset did not complete.'
  }

  $remainingRules = Invoke-LocalPsql -Sql 'SELECT count(*) FROM public.rental_stop_rule_versions;'
  if ([int]$remainingRules -ne 0) {
    throw "Concurrency verification cleanup failed: $remainingRules test rules remain."
  }
}

if ($null -ne $testFailure) {
  throw $testFailure
}

Write-Output 'PASS: disposable database reset completed and zero stop-rent rules persist.'
