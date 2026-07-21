# Key Migration Verification - rfq-transition Authorization enforcement - LOCAL ONLY
#
# Proves that after migrating rfq-transition/index.ts from
# SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY to SUPABASE_PUBLISHABLE_KEYS/
# SUPABASE_SECRET_KEYS (see keys.ts), the function still correctly enforces
# authentication on the Authorization header:
#
#   Case 1: missing Authorization header      -> 401
#   Case 2: garbage/invalid JWT                -> 401
#   Case 3: valid session JWT                  -> 200, and the RFQ's
#                                                  operational_status is
#                                                  actually updated in the DB
#
# This targets the function as served with the local-only fallback env vars, e.g.:
#   . ./supabase/local_key_bridge.ps1
#   supabase functions serve rfq-transition --env-file supabase/.env.functions.local
#
# Run from repo root: powershell -ExecutionPolicy Bypass -File supabase/key_migration_verify.ps1
# Requires: Docker running, local Supabase running (supabase start)

$API_URL  = "http://127.0.0.1:54321"
$FN_URL   = "$API_URL/functions/v1/rfq-transition"
$PASSWORD = "TestPass123!"

$ANON_KEY = $env:SUPABASE_ANON_KEY
if ([string]::IsNullOrWhiteSpace($ANON_KEY)) {
    throw "SUPABASE_ANON_KEY environment variable is required. Do not hardcode anon keys in this script."
}
$ADMIN_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
if ([string]::IsNullOrWhiteSpace($ADMIN_KEY)) {
    throw "SUPABASE_SERVICE_ROLE_KEY environment variable is required. Do not hardcode service-role keys in this script."
}

# ---- Local-only guard -------------------------------------------------------

if ($API_URL -notmatch "^https?://(127\.0\.0\.1|localhost)(:\d+)?") {
    Write-Host "ERROR: This script is LOCAL ONLY."
    Write-Host "  API URL: $API_URL"
    Write-Host "  This script must never target a remote Supabase project."
    exit 1
}

$script:PASS = 0
$script:FAIL = 0

# ---- Fixture UUIDs (a2/b2/d2 prefix - distinct from other verify scripts) --

$USER_CUST = "a2000000-0000-0000-0000-000000000001"
$ORG_CUST  = "b2000000-0000-0000-0000-000000000001"
$RFQ_ID    = "d2000000-0000-0000-0000-000000000001"

# ---- Helpers ----------------------------------------------------------------

function Get-JWT($email) {
  $body = @{ email = $email; password = $PASSWORD } | ConvertTo-Json
  $resp = Invoke-RestMethod -Method Post `
    -Uri "$API_URL/auth/v1/token?grant_type=password" `
    -Headers @{ apikey = $ANON_KEY; "Content-Type" = "application/json" } `
    -Body $body
  return $resp.access_token
}

function Get-ErrorResult($errorRecord) {
  $httpResp = $null
  if ($errorRecord.Exception.PSObject.Properties.Name -contains "Response") { $httpResp = $errorRecord.Exception.Response }

  $code = 0
  if ($httpResp) { try { $code = [int]$httpResp.StatusCode } catch { $code = 0 } }

  $text = $null
  if ($errorRecord.ErrorDetails -and $errorRecord.ErrorDetails.Message) {
    $text = $errorRecord.ErrorDetails.Message
  } elseif ($httpResp) {
    try {
      $stream = $httpResp.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $text   = $reader.ReadToEnd(); $reader.Close()
    } catch { $text = $null }
  }
  if (-not $text) { $text = "" }

  $parsed = $null
  if ($text) { try { $parsed = $text | ConvertFrom-Json } catch { $parsed = @{ error = $text } } }

  if (-not $httpResp) {
    return @{ status = 0; body = $null; error = $errorRecord.Exception.Message }
  }
  return @{ status = $code; body = $parsed }
}

function Invoke-RF($jwt, $rfq_id, $new_status) {
  $hdrs = @{ apikey = $ANON_KEY; "Content-Type" = "application/json" }
  if ($jwt) { $hdrs["Authorization"] = "Bearer $jwt" }
  $body = @{ rfq_id = $rfq_id; new_status = $new_status } | ConvertTo-Json
  try {
    $resp = Invoke-RestMethod -Method Post -Uri $FN_URL -Headers $hdrs -Body $body
    return @{ status = 200; body = $resp }
  } catch {
    return Get-ErrorResult $_
  }
}

function Check($label, $got, $want) {
  if ($got -eq $want) {
    $script:PASS++
    Write-Host "  PASS  $label"
  } else {
    $script:FAIL++
    Write-Host "  FAIL  $label  (expected $want, got $got)"
  }
}

function Psql-Scalar($sql) {
  $out = docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -t -c $sql 2>&1
  return (($out | ForEach-Object { $_.ToString() }) -join "").Trim()
}

function Psql-File($sql) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($sql)
  $tmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllBytes($tmp, $bytes)
  docker cp $tmp supabase_db_encqbibzgoarvtcivgra:/tmp/key_migration_scratch.sql | Out-Null
  docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -f /tmp/key_migration_scratch.sql 2>&1
}

function New-AuthUser($id, $email) {
  $body = @{ id = $id; email = $email; password = $PASSWORD; email_confirm = $true } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post `
      -Uri "$API_URL/auth/v1/admin/users" `
      -Headers @{ apikey = $ADMIN_KEY; Authorization = "Bearer $ADMIN_KEY"; "Content-Type" = "application/json" } `
      -Body $body | Out-Null
  } catch { }
}

function Remove-AuthUser($id) {
  try {
    Invoke-RestMethod -Method Delete `
      -Uri "$API_URL/auth/v1/admin/users/$id" `
      -Headers @{ apikey = $ADMIN_KEY; Authorization = "Bearer $ADMIN_KEY" } | Out-Null
  } catch { }
}

# ---- Setup --------------------------------------------------------------------

Write-Host ""
Write-Host "Creating auth user..."
New-AuthUser $USER_CUST "km-cust@test.local"
Write-Host "  Auth user created."

Write-Host "Seeding test data..."
Psql-File @"
INSERT INTO public.organizations (id, name, org_type, is_simulated)
  VALUES ('$ORG_CUST'::uuid, 'KM Customer Org', 'customer', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_memberships (organization_id, user_id, role)
  VALUES ('$ORG_CUST'::uuid, '$USER_CUST'::uuid, 'owner')
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.rental_requests (id, customer_id, customer_organization_id, operational_status)
  VALUES ('$RFQ_ID'::uuid, '$USER_CUST'::uuid, '$ORG_CUST'::uuid, 'draft')
ON CONFLICT (id) DO NOTHING;
"@ | Out-Null
Write-Host "  SQL seed complete."

Write-Host "Signing in..."
$jwt_cust = Get-JWT "km-cust@test.local"
Write-Host "  JWT acquired."
Write-Host ""

# ---- Case 1: missing Authorization header --------------------------------

Write-Host "Case 1: missing Authorization header"
$r1 = Invoke-RF $null $RFQ_ID "submitted"
Check "C1 status=401" $r1.status 401

# ---- Case 2: garbage/invalid JWT -------------------------------------------

Write-Host "Case 2: garbage/invalid JWT"
$r2 = Invoke-RF "not.a.valid.jwt" $RFQ_ID "submitted"
Check "C2 status=401" $r2.status 401

$dbStAfterRejections = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$RFQ_ID'::uuid"
Check "C1/C2 did not mutate DB (still draft)" $dbStAfterRejections "draft"

# ---- Case 3: valid session JWT ---------------------------------------------

Write-Host "Case 3: valid session JWT (new publishable/secret keys, happy path)"
$r3 = Invoke-RF $jwt_cust $RFQ_ID "submitted"
Check "C3 status=200" $r3.status 200
Check "C3 correlation_id present" ($null -ne $r3.body -and $null -ne $r3.body.correlation_id) $true

$dbStAfterAccept = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$RFQ_ID'::uuid"
Check "C3 db_status=submitted" $dbStAfterAccept "submitted"

Write-Host ""

# ---- Cleanup ------------------------------------------------------------------

Write-Host "Cleaning up..."
Psql-File @"
DELETE FROM public.audit_events WHERE related_rfq_id = '$RFQ_ID'::uuid;
DELETE FROM public.rental_requests WHERE id = '$RFQ_ID'::uuid;
DELETE FROM public.organization_memberships WHERE organization_id = '$ORG_CUST'::uuid;
DELETE FROM public.organizations WHERE id = '$ORG_CUST'::uuid;
"@ | Out-Null
Remove-AuthUser $USER_CUST
Write-Host "  Cleanup complete."
Write-Host ""

# ---- Summary --------------------------------------------------------------

Write-Host "================================================================"
Write-Host "PASS: $script:PASS   FAIL: $script:FAIL"
Write-Host "================================================================"
if ($script:FAIL -gt 0) { exit 1 }
