# Local key bridge - LOCAL ONLY
#
# Bridges the local Supabase stack's key material into the shapes the
# migrated tooling expects. Never prints key values to the console and
# never writes them anywhere Git-tracked.
#
#   - Sets $env:SUPABASE_ANON_KEY / $env:SUPABASE_SERVICE_ROLE_KEY in the
#     CURRENT session, for the legacy verify_*.ps1 scripts (membership_verify,
#     rfq_transition_verify, b6_2_vendor_authority_verify,
#     b6_3_vqr_pending_review_verify).
#   - Writes supabase/.env.functions.local (gitignored via the repo's
#     blanket `*.local` rule in .gitignore) containing ALLRENTZ_LOCAL_*
#     fallback variables in the JSON-dict shape rfq-transition/keys.ts
#     expects, for use with:
#       supabase functions serve rfq-transition --env-file supabase/.env.functions.local
#
# IMPORTANT: this script must be dot-sourced, not just executed, or the
# session env vars it sets will not survive past this process:
#   . ./supabase/local_key_bridge.ps1
#
# Run from repo root. Requires: local Supabase running (supabase start).

$ErrorActionPreference = "Stop"

$raw = supabase status -o env
if ($LASTEXITCODE -ne 0) {
    throw "supabase status failed - is the local stack running? (supabase start)"
}

$values = @{}
foreach ($line in $raw -split "`n") {
    $line = $line.Trim()
    if ($line -match '^([A-Z_][A-Z0-9_]*)=(.*)$') {
        $values[$Matches[1]] = $Matches[2].Trim('"')
    }
}

$required = @('API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY', 'PUBLISHABLE_KEY', 'SECRET_KEY')
foreach ($name in $required) {
    if (-not $values.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($values[$name])) {
        throw "Local Supabase status did not report $name. Is 'supabase start' running?"
    }
}

if ($values['API_URL'] -notmatch '^https?://(127\.0\.0\.1|localhost)(:\d+)?$') {
    throw "Refusing to bridge keys: API_URL is not a local address ($($values['API_URL']))."
}

# ---- Session env vars for the legacy verify_*.ps1 scripts ------------------

$env:SUPABASE_ANON_KEY = $values['ANON_KEY']
$env:SUPABASE_SERVICE_ROLE_KEY = $values['SERVICE_ROLE_KEY']

Write-Host "Set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY for this session (values not shown)."

# ---- supabase/.env.functions.local for 'supabase functions serve --env-file'

$backendSecretKeyName = 'allrentz_backend_rotation_20260720'

$pubDict = @{}
$pubDict['local'] = $values['PUBLISHABLE_KEY']
$publishableKeysJson = $pubDict | ConvertTo-Json -Compress

$secretDict = @{}
$secretDict[$backendSecretKeyName] = $values['SECRET_KEY']
$secretKeysJson = $secretDict | ConvertTo-Json -Compress

$envFilePath = Join-Path $PSScriptRoot ".env.functions.local"
$lines = @(
    "ALLRENTZ_LOCAL_SUPABASE_URL=$($values['API_URL'])"
    "ALLRENTZ_LOCAL_SUPABASE_PUBLISHABLE_KEYS=$publishableKeysJson"
    "ALLRENTZ_LOCAL_SUPABASE_SECRET_KEYS=$secretKeysJson"
)
$envFileContent = ($lines -join [Environment]::NewLine) + [Environment]::NewLine
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($envFilePath, $envFileContent, $utf8NoBom)

$firstThreeBytes = [byte[]]::new(3)
$envFileStream = [System.IO.File]::OpenRead($envFilePath)
try {
    $bytesRead = $envFileStream.Read($firstThreeBytes, 0, 3)
} finally {
    $envFileStream.Dispose()
}

if ($bytesRead -eq 3 -and
    $firstThreeBytes[0] -eq 0xEF -and
    $firstThreeBytes[1] -eq 0xBB -and
    $firstThreeBytes[2] -eq 0xBF) {
    throw "Generated function environment file unexpectedly contains a UTF-8 BOM."
}

Write-Host "Wrote $envFilePath (gitignored via *.local; values not shown)."
Write-Host ""
Write-Host "Next: supabase functions serve rfq-transition --env-file supabase/.env.functions.local"
