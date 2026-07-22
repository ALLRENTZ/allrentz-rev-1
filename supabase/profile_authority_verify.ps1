param(
  [ValidateSet("Vulnerable", "Contained")]
  [string]$ExpectedMode = "Contained"
)

# Profile and platform-role authority verification - LOCAL ONLY
#
# Vulnerable mode captures the controlled pre-fix behavior. Contained mode
# verifies the Stage 1 grant/policy containment. Neither mode treats profile
# status as an enforced account state or defines a privileged-role assignment
# command; those remain Stage 2 work.

$API_URL = "http://127.0.0.1:54321"
$REST_URL = "$API_URL/rest/v1"
$FN_URL = "$API_URL/functions/v1/rfq-transition"
$PASSWORD = "TestPass123!"

$ANON_KEY = $env:SUPABASE_ANON_KEY
if ([string]::IsNullOrWhiteSpace($ANON_KEY)) {
  throw "SUPABASE_ANON_KEY is required. Dot-source supabase/local_key_bridge.ps1 first."
}

$ADMIN_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
if ([string]::IsNullOrWhiteSpace($ADMIN_KEY)) {
  throw "SUPABASE_SERVICE_ROLE_KEY is required. Dot-source supabase/local_key_bridge.ps1 first."
}

if ($API_URL -notmatch "^https?://(127\.0\.0\.1|localhost)(:\d+)?$") {
  throw "This verification is LOCAL ONLY."
}

$script:PASS = 0
$script:FAIL = 0

$ATTACKER_ID = "a3000000-0000-0000-0000-000000000001"
$OWNER_ID = "a3000000-0000-0000-0000-000000000002"
$INSERT_ID = "a3000000-0000-0000-0000-000000000003"
$RFQ_ID = "a3000000-0000-0000-0000-000000000011"

function Get-ErrorResult($errorRecord) {
  $response = $null
  if ($errorRecord.Exception.PSObject.Properties.Name -contains "Response") {
    $response = $errorRecord.Exception.Response
  }

  $status = 0
  if ($response) {
    try { $status = [int]$response.StatusCode } catch { $status = 0 }
  }

  return @{ status = $status }
}

function Invoke-REST($method, $path, $jwt, $bodyObject, $query, $prefer) {
  $headers = @{ apikey = $ANON_KEY; "Content-Type" = "application/json" }
  if ($jwt) { $headers["Authorization"] = "Bearer $jwt" }
  if ($prefer) { $headers["Prefer"] = $prefer }

  $url = "$REST_URL/$path"
  if ($query) { $url = "$url$query" }

  $parameters = @{ Method = $method; Uri = $url; Headers = $headers }
  if ($null -ne $bodyObject) {
    $parameters["Body"] = $bodyObject | ConvertTo-Json
  }

  try {
    $body = Invoke-RestMethod @parameters
    return @{ status = 200; body = $body }
  } catch {
    return Get-ErrorResult $_
  }
}

function Invoke-RFQTransition($jwt, $rfqId, $newStatus) {
  $headers = @{
    apikey = $ANON_KEY
    Authorization = "Bearer $jwt"
    "Content-Type" = "application/json"
  }
  $body = @{ rfq_id = $rfqId; new_status = $newStatus } | ConvertTo-Json

  try {
    $response = Invoke-RestMethod -Method Post -Uri $FN_URL -Headers $headers -Body $body
    return @{ status = 200; body = $response }
  } catch {
    return Get-ErrorResult $_
  }
}

function Get-JWT($email) {
  $body = @{ email = $email; password = $PASSWORD } | ConvertTo-Json
  $response = Invoke-RestMethod -Method Post `
    -Uri "$API_URL/auth/v1/token?grant_type=password" `
    -Headers @{ apikey = $ANON_KEY; "Content-Type" = "application/json" } `
    -Body $body
  return $response.access_token
}

function New-AuthUser($id, $email) {
  $body = @{
    id = $id
    email = $email
    password = $PASSWORD
    email_confirm = $true
  } | ConvertTo-Json

  Invoke-RestMethod -Method Post `
    -Uri "$API_URL/auth/v1/admin/users" `
    -Headers @{
      apikey = $ADMIN_KEY
      Authorization = "Bearer $ADMIN_KEY"
      "Content-Type" = "application/json"
    } `
    -Body $body | Out-Null
}

function Remove-AuthUser($id) {
  try {
    Invoke-RestMethod -Method Delete `
      -Uri "$API_URL/auth/v1/admin/users/$id" `
      -Headers @{ apikey = $ADMIN_KEY; Authorization = "Bearer $ADMIN_KEY" } | Out-Null
  } catch { }
}

function Psql-Scalar($sql) {
  $output = docker exec supabase_db_encqbibzgoarvtcivgra `
    psql -U postgres -d postgres -X -tAc $sql 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Local database query failed." }
  return (($output | ForEach-Object { $_.ToString() }) -join "").Trim()
}

function Psql-File($sql) {
  $temporaryPath = [System.IO.Path]::GetTempFileName()
  try {
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($temporaryPath, $sql, $utf8NoBom)
    docker cp $temporaryPath supabase_db_encqbibzgoarvtcivgra:/tmp/profile_authority_verify.sql | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Unable to copy local verification SQL." }
    docker exec supabase_db_encqbibzgoarvtcivgra `
      psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 -f /tmp/profile_authority_verify.sql 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Local verification SQL failed." }
  } finally {
    Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
  }
}

function Check($label, $actual, $expected) {
  if ($actual -eq $expected) {
    $script:PASS++
    Write-Host "  PASS  $label"
  } else {
    $script:FAIL++
    Write-Host "  FAIL  $label (expected $expected, got $actual)"
  }
}

function Invoke-Cleanup {
  Psql-File @"
DELETE FROM public.audit_events WHERE related_rfq_id = '$RFQ_ID'::uuid;
DELETE FROM public.rfq_operational_status WHERE rfq_id = '$RFQ_ID'::uuid;
DELETE FROM public.rental_requests WHERE id = '$RFQ_ID'::uuid;
"@ | Out-Null

  Remove-AuthUser $ATTACKER_ID
  Remove-AuthUser $OWNER_ID
  Remove-AuthUser $INSERT_ID
}

Write-Host ""
Write-Host "========================================"
Write-Host "Profile Authority Verification"
Write-Host "Expected mode: $ExpectedMode"
Write-Host "LOCAL ONLY - $API_URL"
Write-Host "========================================"

Write-Host "Pre-run cleanup..."
Invoke-Cleanup

try {
  Write-Host "Creating synthetic local users..."
  New-AuthUser $ATTACKER_ID "profile-attacker@test.local"
  New-AuthUser $OWNER_ID "profile-owner@test.local"
  New-AuthUser $INSERT_ID "profile-insert@test.local"

  Psql-File @"
DELETE FROM public.profiles WHERE id = '$INSERT_ID'::uuid;
INSERT INTO public.rental_requests (id, customer_id, operational_status)
VALUES ('$RFQ_ID'::uuid, '$OWNER_ID'::uuid, 'draft');
"@ | Out-Null

  $attackerJwt = Get-JWT "profile-attacker@test.local"
  $insertJwt = Get-JWT "profile-insert@test.local"
  Write-Host "  Synthetic sessions acquired (values not shown)."

  $expectedProfileWriteStatus = if ($ExpectedMode -eq "Vulnerable") { 200 } else { 403 }
  $expectedRole = if ($ExpectedMode -eq "Vulnerable") { "admin" } else { "customer" }
  $expectedStatus = if ($ExpectedMode -eq "Vulnerable") { "inactive" } else { "active" }
  $expectedName = if ($ExpectedMode -eq "Vulnerable") { "Client Mutated" } else { "" }
  $expectedEmail = if ($ExpectedMode -eq "Vulnerable") { "mutated@test.local" } else { "profile-attacker@test.local" }
  $expectedInsertStatus = if ($ExpectedMode -eq "Vulnerable") { 200 } else { 403 }

  Write-Host ""
  Write-Host "CASE A: profile field authority"
  $rolePatch = Invoke-REST "Patch" "profiles" $attackerJwt `
    @{ role_type = "admin" } "?id=eq.$ATTACKER_ID" "return=representation"
  $statusPatch = Invoke-REST "Patch" "profiles" $attackerJwt `
    @{ status = "inactive" } "?id=eq.$ATTACKER_ID" "return=representation"
  $namePatch = Invoke-REST "Patch" "profiles" $attackerJwt `
    @{ full_name = "Client Mutated" } "?id=eq.$ATTACKER_ID" "return=representation"
  $emailPatch = Invoke-REST "Patch" "profiles" $attackerJwt `
    @{ email = "mutated@test.local" } "?id=eq.$ATTACKER_ID" "return=representation"
  $demoPatch = Invoke-REST "Patch" "profiles" $attackerJwt `
    @{ is_demo = $true } "?id=eq.$ATTACKER_ID" "return=representation"

  Check "role_type PATCH status" $rolePatch.status $expectedProfileWriteStatus
  Check "status PATCH status" $statusPatch.status $expectedProfileWriteStatus
  Check "full_name PATCH status" $namePatch.status $expectedProfileWriteStatus
  Check "email PATCH status" $emailPatch.status $expectedProfileWriteStatus
  Check "is_demo PATCH status" $demoPatch.status $expectedProfileWriteStatus

  $profileState = Psql-Scalar "SELECT role_type || '|' || status || '|' || is_demo::text || '|' || COALESCE(full_name, '') || '|' || COALESCE(email, '') FROM public.profiles WHERE id = '$ATTACKER_ID'::uuid;"
  Check "persisted profile state" $profileState "$expectedRole|$expectedStatus|false|$expectedName|$expectedEmail"
  if ($ExpectedMode -eq "Vulnerable") {
    Write-Host "  is_demo remained false pre-fix because its existing trigger was already effective."
  } else {
    Write-Host "  is_demo remains false because Stage 1 denies the client UPDATE."
  }

  Write-Host ""
  Write-Host "CASE B: direct profile insertion"
  $profileInsert = Invoke-REST "Post" "profiles" $insertJwt @{
    id = $INSERT_ID
    email = "client-inserted@test.local"
    role_type = "customer"
    status = "active"
    is_demo = $false
  } $null "return=representation"
  Check "direct profile INSERT status" $profileInsert.status $expectedInsertStatus
  $insertedProfileCount = Psql-Scalar "SELECT COUNT(*) FROM public.profiles WHERE id = '$INSERT_ID'::uuid;"
  $expectedInsertedCount = if ($ExpectedMode -eq "Vulnerable") { "1" } else { "0" }
  Check "direct profile INSERT persistence" $insertedProfileCount $expectedInsertedCount

  Write-Host ""
  Write-Host "CASE C: platform role writes"
  $roleInsert = Invoke-REST "Post" "user_roles" $attackerJwt @{
    user_id = $ATTACKER_ID
    role = "admin"
  } $null "return=representation"
  $roleUpdate = Invoke-REST "Patch" "user_roles" $attackerJwt `
    @{ role = "vendor" } "?user_id=eq.$ATTACKER_ID&role=eq.customer" "return=representation"
  $roleDelete = Invoke-REST "Delete" "user_roles" $attackerJwt `
    $null "?user_id=eq.$ATTACKER_ID&role=eq.customer" "return=representation"

  if ($ExpectedMode -eq "Contained") {
    Check "user_roles INSERT status" $roleInsert.status 403
    Check "user_roles UPDATE status" $roleUpdate.status 403
    Check "user_roles DELETE status" $roleDelete.status 403
  } else {
    Check "user_roles INSERT was already blocked" $roleInsert.status 403
  }

  $roleState = Psql-Scalar "SELECT string_agg(role::text, ',' ORDER BY role::text) FROM public.user_roles WHERE user_id = '$ATTACKER_ID'::uuid;"
  Check "platform role remains customer" $roleState "customer"

  Write-Host ""
  Write-Host "CASE D: backend authority remains separate from profile persona"
  $transition = Invoke-RFQTransition $attackerJwt $RFQ_ID "submitted"
  Check "non-owner transition denied" $transition.status 403
  $rfqStatus = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$RFQ_ID'::uuid;"
  Check "RFQ state remains draft" $rfqStatus "draft"

  Write-Host ""
  Write-Host "CASE E: authenticated self-read remains available"
  $profileRead = Invoke-REST "Get" "profiles" $attackerJwt $null `
    "?id=eq.$ATTACKER_ID&select=id,role_type,status,is_demo" $null
  $rolesRead = Invoke-REST "Get" "user_roles" $attackerJwt $null `
    "?user_id=eq.$ATTACKER_ID&select=user_id,role" $null
  Check "profile self-read status" $profileRead.status 200
  Check "platform-role self-read status" $rolesRead.status 200
} finally {
  Write-Host ""
  Write-Host "Post-run cleanup..."
  Invoke-Cleanup
  $cleanupCount = Psql-Scalar "SELECT (SELECT COUNT(*) FROM auth.users WHERE id IN ('$ATTACKER_ID'::uuid, '$OWNER_ID'::uuid, '$INSERT_ID'::uuid)) + (SELECT COUNT(*) FROM public.rental_requests WHERE id = '$RFQ_ID'::uuid);"
  Check "synthetic fixture removed" $cleanupCount "0"
}

Write-Host ""
Write-Host "========================================"
Write-Host "RESULT: $($script:PASS) passed, $($script:FAIL) failed"
Write-Host "========================================"

if ($script:FAIL -gt 0) { exit 1 }
