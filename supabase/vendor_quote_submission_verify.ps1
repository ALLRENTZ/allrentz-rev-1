# Backend-authoritative vendor quote submission verification - LOCAL ONLY
#
# Proves that submit_vendor_quote validates vendor authority, derives every
# lifecycle field, commits quote + RFQ transition + audit atomically, and that
# authenticated clients cannot write vendor_quote_responses directly.

$API_URL  = "http://127.0.0.1:54321"
$REST_URL = "$API_URL/rest/v1"
$PASSWORD = "TestPass123!"
$ANON_KEY = $env:SUPABASE_ANON_KEY
if ([string]::IsNullOrWhiteSpace($ANON_KEY)) {
    throw "SUPABASE_ANON_KEY environment variable is required. Do not hardcode keys."
}
$ADMIN_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
if ([string]::IsNullOrWhiteSpace($ADMIN_KEY)) {
    throw "SUPABASE_SERVICE_ROLE_KEY environment variable is required. Do not hardcode keys."
}

if ($API_URL -notmatch "^https?://(127\.0\.0\.1|localhost)(:\d+)?") {
    throw "LOCAL ONLY verification cannot target $API_URL"
}

$P = "b6b60005-0000-0000-0000-0000000000"
$USER_CUST = "${P}01"
$USER_VEND = "${P}02"
$ORG_CUST = "${P}11"
$ORG_VEND = "${P}12"
$ORG_OTHER = "${P}13"
$ORG_ARCHIVED_MEMBERSHIP = "${P}14"
$ORG_ARCHIVED = "${P}15"
$ORG_CUSTOMER_ONLY = "${P}16"
$ORG_SIMULATED = "${P}17"
$RFQ_OK = "${P}21"
$RFQ_UNINVITED = "${P}22"
$RFQ_WRONG_STATE = "${P}23"
$RFQ_ARCHIVED_MEMBERSHIP = "${P}24"
$RFQ_ARCHIVED_ORG = "${P}25"
$RFQ_CUSTOMER_ORG = "${P}26"
$RFQ_SIM_MISMATCH = "${P}27"
$RFQ_DIRECT_WRITE = "${P}28"

$script:PASS = 0
$script:FAIL = 0

function Check($label, $got, $want) {
    if ($got -eq $want) {
        $script:PASS++
        Write-Host "  PASS  $label"
    } else {
        $script:FAIL++
        Write-Host "  FAIL  $label (expected '$want', got '$got')"
    }
}

function Check-Blocked($label, $result) {
    if ($result.status -in @(400, 401, 403, 404, 409, 422)) {
        $script:PASS++
        Write-Host "  PASS  $label (HTTP $($result.status))"
    } else {
        $script:FAIL++
        Write-Host "  FAIL  $label (expected a controlled rejection, got HTTP $($result.status))"
    }
}

function Psql-Scalar($sql) {
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    return (docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -d postgres -X -tAc $sql 2>&1).Trim()
}

function Psql-File($sql) {
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($sql)
    $tmp = [System.IO.Path]::GetTempFileName()
    try {
        [System.IO.File]::WriteAllBytes($tmp, $bytes)
        docker cp $tmp supabase_db_encqbibzgoarvtcivgra:/tmp/vendor_quote_submission_verify.sql | Out-Null
        docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 -f /tmp/vendor_quote_submission_verify.sql 2>&1
    } finally {
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
}

function Get-ErrorResult($errorRecord) {
    $httpResp = $null
    if ($errorRecord.Exception.PSObject.Properties.Name -contains "Response") {
        $httpResp = $errorRecord.Exception.Response
    }
    $code = 0
    if ($httpResp) { try { $code = [int]$httpResp.StatusCode } catch { $code = 0 } }
    $text = if ($errorRecord.ErrorDetails -and $errorRecord.ErrorDetails.Message) {
        $errorRecord.ErrorDetails.Message
    } else {
        $errorRecord.Exception.Message
    }
    $parsed = $null
    if ($text) { try { $parsed = $text | ConvertFrom-Json } catch { $parsed = @{ error = $text } } }
    return @{ status = $code; body = $parsed; error = $text }
}

function Invoke-REST($method, $path, $jwt, $bodyObj, $query = $null) {
    $headers = @{ apikey = $ANON_KEY; "Content-Type" = "application/json" }
    if ($jwt) { $headers.Authorization = "Bearer $jwt" }
    $uri = "$REST_URL/$path"
    if ($query) { $uri += $query }
    try {
        $params = @{ Method = $method; Uri = $uri; Headers = $headers }
        if ($null -ne $bodyObj) { $params.Body = ($bodyObj | ConvertTo-Json -Depth 10) }
        $body = Invoke-RestMethod @params
        return @{ status = 200; body = $body }
    } catch {
        return Get-ErrorResult $_
    }
}

function Invoke-Submit($jwt, $rfqId, $orgId, $overrides = @{}) {
    $body = @{
        p_rfq_id = $rfqId
        p_vendor_organization_id = $orgId
        p_daily_rate = 1500.00
        p_delivery_fee = 125.00
        p_mobilization_fee = 75.00
        p_minimum_rental_days = 3
        p_available_start_date = "2026-08-01"
        p_equipment_substitution = $false
        p_compliance_confirmed = $true
        p_compliance_notes = @("verified")
        p_vendor_notes = "Backend-authoritative verification quote"
    }
    foreach ($key in $overrides.Keys) { $body[$key] = $overrides[$key] }
    return Invoke-REST "Post" "rpc/submit_vendor_quote" $jwt $body
}

function New-AuthUser($id, $email) {
    $body = @{ id = $id; email = $email; password = $PASSWORD; email_confirm = $true } | ConvertTo-Json
    try {
        Invoke-RestMethod -Method Post -Uri "$API_URL/auth/v1/admin/users" `
            -Headers @{ apikey = $ADMIN_KEY; Authorization = "Bearer $ADMIN_KEY"; "Content-Type" = "application/json" } `
            -Body $body | Out-Null
    } catch { }
}

function Remove-AuthUser($id) {
    try {
        Invoke-RestMethod -Method Delete -Uri "$API_URL/auth/v1/admin/users/$id" `
            -Headers @{ apikey = $ADMIN_KEY; Authorization = "Bearer $ADMIN_KEY" } | Out-Null
    } catch { }
}

function Get-JWT($email) {
    $body = @{ email = $email; password = $PASSWORD } | ConvertTo-Json
    return (Invoke-RestMethod -Method Post -Uri "$API_URL/auth/v1/token?grant_type=password" `
        -Headers @{ apikey = $ANON_KEY; "Content-Type" = "application/json" } -Body $body).access_token
}

function Invoke-Cleanup {
    $rfqs = @($RFQ_OK, $RFQ_UNINVITED, $RFQ_WRONG_STATE, $RFQ_ARCHIVED_MEMBERSHIP, $RFQ_ARCHIVED_ORG, $RFQ_CUSTOMER_ORG, $RFQ_SIM_MISMATCH, $RFQ_DIRECT_WRITE)
    $rfqList = ($rfqs | ForEach-Object { "'$_'::uuid" }) -join ","
    $orgs = @($ORG_CUST, $ORG_VEND, $ORG_OTHER, $ORG_ARCHIVED_MEMBERSHIP, $ORG_ARCHIVED, $ORG_CUSTOMER_ONLY, $ORG_SIMULATED)
    $orgList = ($orgs | ForEach-Object { "'$_'::uuid" }) -join ","
    Psql-File @"
DELETE FROM public.rfq_operational_status WHERE rfq_id IN ($rfqList);
DELETE FROM public.audit_events WHERE related_rfq_id IN ($rfqList);
DELETE FROM public.vendor_quote_responses WHERE rfq_id IN ($rfqList);
DELETE FROM public.rfq_vendor_invitations WHERE rfq_id IN ($rfqList);
DELETE FROM public.rental_requests WHERE id IN ($rfqList);
DELETE FROM public.organization_memberships WHERE organization_id IN ($orgList);
DELETE FROM public.organizations WHERE id IN ($orgList);
"@ | Out-Null
    Remove-AuthUser $USER_CUST
    Remove-AuthUser $USER_VEND
}

Write-Host ""
Write-Host "============================================================"
Write-Host "Vendor Quote Submission Authority Verification - LOCAL ONLY"
Write-Host "============================================================"

Write-Host "Pre-run cleanup..."
Invoke-Cleanup

New-AuthUser $USER_CUST "vqs-customer@test.local"
New-AuthUser $USER_VEND "vqs-vendor@test.local"

Psql-File @"
UPDATE public.profiles SET is_demo = false WHERE id IN ('$USER_CUST'::uuid, '$USER_VEND'::uuid);

INSERT INTO public.organizations (id, name, org_type, archived_at, is_simulated) VALUES
  ('$ORG_CUST', 'VQS Customer', 'customer', NULL, false),
  ('$ORG_VEND', 'VQS Active Vendor', 'vendor', NULL, false),
  ('$ORG_OTHER', 'VQS Other Vendor', 'vendor', NULL, false),
  ('$ORG_ARCHIVED_MEMBERSHIP', 'VQS Archived Membership Vendor', 'vendor', NULL, false),
  ('$ORG_ARCHIVED', 'VQS Archived Vendor', 'vendor', now(), false),
  ('$ORG_CUSTOMER_ONLY', 'VQS Customer Only', 'customer', NULL, false),
  ('$ORG_SIMULATED', 'VQS Simulated Vendor', 'vendor', NULL, true);

INSERT INTO public.organization_memberships
  (organization_id, user_id, role, archived_at, is_simulated) VALUES
  ('$ORG_CUST', '$USER_CUST', 'owner', NULL, false),
  ('$ORG_VEND', '$USER_VEND', 'member', NULL, false),
  ('$ORG_ARCHIVED_MEMBERSHIP', '$USER_VEND', 'member', now(), false),
  ('$ORG_ARCHIVED', '$USER_VEND', 'member', NULL, false),
  ('$ORG_CUSTOMER_ONLY', '$USER_VEND', 'member', NULL, false),
  ('$ORG_SIMULATED', '$USER_VEND', 'member', NULL, true);

INSERT INTO public.rental_requests
  (id, customer_id, customer_organization_id, operational_status, is_simulated) VALUES
  ('$RFQ_OK', '$USER_CUST', '$ORG_CUST', 'pending_vendor_review', false),
  ('$RFQ_UNINVITED', '$USER_CUST', '$ORG_CUST', 'pending_vendor_review', false),
  ('$RFQ_WRONG_STATE', '$USER_CUST', '$ORG_CUST', 'vendor_quote_received', false),
  ('$RFQ_ARCHIVED_MEMBERSHIP', '$USER_CUST', '$ORG_CUST', 'pending_vendor_review', false),
  ('$RFQ_ARCHIVED_ORG', '$USER_CUST', '$ORG_CUST', 'pending_vendor_review', false),
  ('$RFQ_CUSTOMER_ORG', '$USER_CUST', '$ORG_CUST', 'pending_vendor_review', false),
  ('$RFQ_SIM_MISMATCH', '$USER_CUST', '$ORG_CUST', 'pending_vendor_review', true),
  ('$RFQ_DIRECT_WRITE', '$USER_CUST', '$ORG_CUST', 'pending_vendor_review', false);

INSERT INTO public.rfq_vendor_invitations
  (rfq_id, vendor_organization_id, invited_by, invitation_status, is_simulated) VALUES
  ('$RFQ_OK', '$ORG_VEND', '$USER_CUST', 'invited', false),
  ('$RFQ_WRONG_STATE', '$ORG_VEND', '$USER_CUST', 'invited', false),
  ('$RFQ_ARCHIVED_MEMBERSHIP', '$ORG_ARCHIVED_MEMBERSHIP', '$USER_CUST', 'invited', false),
  ('$RFQ_ARCHIVED_ORG', '$ORG_ARCHIVED', '$USER_CUST', 'invited', false),
  ('$RFQ_CUSTOMER_ORG', '$ORG_CUSTOMER_ONLY', '$USER_CUST', 'invited', false),
  ('$RFQ_SIM_MISMATCH', '$ORG_SIMULATED', '$USER_CUST', 'invited', true),
  ('$RFQ_DIRECT_WRITE', '$ORG_VEND', '$USER_CUST', 'invited', false);
"@ | Out-Null

$jwt = Get-JWT "vqs-vendor@test.local"

Write-Host ""
Write-Host "CASE 1: RPC surface rejects lifecycle-field forgery"
$forgeSubmittedBy = Invoke-Submit $jwt $RFQ_OK $ORG_VEND @{ p_submitted_by = $USER_CUST }
Check-Blocked "submitted_by cannot be supplied" $forgeSubmittedBy
$forgeStatus = Invoke-Submit $jwt $RFQ_OK $ORG_VEND @{ p_status = "accepted" }
Check-Blocked "status cannot be supplied" $forgeStatus
$forgeVersionScope = Invoke-Submit $jwt $RFQ_OK $ORG_VEND @{ p_version = 99; p_is_simulated = $true }
Check-Blocked "version and simulation scope cannot be supplied" $forgeVersionScope
$forgeTimestamps = Invoke-Submit $jwt $RFQ_OK $ORG_VEND @{ p_submitted_at = "2000-01-01T00:00:00Z"; p_created_at = "2000-01-01T00:00:00Z" }
Check-Blocked "timestamps cannot be supplied" $forgeTimestamps
$forgeFinalization = Invoke-Submit $jwt $RFQ_OK $ORG_VEND @{ p_accepted_by = $USER_VEND; p_rejected_by = $USER_VEND; p_withdrawn_by = $USER_VEND }
Check-Blocked "accepted/rejected/withdrawn metadata cannot be supplied" $forgeFinalization
Check "forgery attempts created no quote" (Psql-Scalar "SELECT COUNT(*) FROM public.vendor_quote_responses WHERE rfq_id = '$RFQ_OK'::uuid") "0"

Write-Host ""
Write-Host "CASE 2: commercial value validation"
$badRate = Invoke-Submit $jwt $RFQ_OK $ORG_VEND @{ p_daily_rate = -1 }
Check-Blocked "negative daily rate rejected" $badRate
Check "invalid commercial input created no quote" (Psql-Scalar "SELECT COUNT(*) FROM public.vendor_quote_responses WHERE rfq_id = '$RFQ_OK'::uuid") "0"

Write-Host ""
Write-Host "CASE 3: authorized submission is atomic and backend-derived"
$ok = Invoke-Submit $jwt $RFQ_OK $ORG_VEND
Check "authorized RPC status" $ok.status 200
$okRow = if ($ok.body -is [System.Array]) { $ok.body[0] } else { $ok.body }
$quoteId = $okRow.quote_id
$correlationId = $okRow.correlation_id
Check "RPC returned quote_id" (-not [string]::IsNullOrWhiteSpace($quoteId)) $true
Check "RPC returned correlation_id" (-not [string]::IsNullOrWhiteSpace($correlationId)) $true
$lifecycle = Psql-Scalar "SELECT submitted_by || '|' || status || '|' || version || '|' || is_simulated || '|' || (submitted_at IS NOT NULL) || '|' || (accepted_by IS NULL AND rejected_by IS NULL AND withdrawn_by IS NULL AND accepted_at IS NULL AND rejected_at IS NULL) FROM public.vendor_quote_responses WHERE id = '$quoteId'::uuid"
Check "backend controls quote lifecycle fields" $lifecycle "$USER_VEND|submitted|1|false|true|true"
$commercial = Psql-Scalar "SELECT daily_rate || '|' || delivery_fee || '|' || mobilization_fee || '|' || minimum_rental_days || '|' || compliance_confirmed FROM public.vendor_quote_responses WHERE id = '$quoteId'::uuid"
Check "legitimate commercial values persisted" $commercial "1500|125|75|3|true"
Check "RFQ transitioned in same action" (Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$RFQ_OK'::uuid") "vendor_quote_received"
Check "one correlated vendor audit event exists" (Psql-Scalar "SELECT COUNT(*) FROM public.audit_events WHERE correlation_id = '$correlationId'::uuid AND actor_id = '$USER_VEND'::uuid AND source = 'vendor_action'") "1"
Check "one status-history row exists" (Psql-Scalar "SELECT COUNT(*) FROM public.rfq_operational_status WHERE correlation_id = '$correlationId'::uuid AND previous_status = 'pending_vendor_review' AND new_status = 'vendor_quote_received'") "1"

Write-Host ""
Write-Host "CASE 4: duplicate submission is controlled"
$duplicate = Invoke-Submit $jwt $RFQ_OK $ORG_VEND
Check-Blocked "duplicate submission rejected" $duplicate
Check "duplicate created no second quote" (Psql-Scalar "SELECT COUNT(*) FROM public.vendor_quote_responses WHERE rfq_id = '$RFQ_OK'::uuid") "1"
Check "duplicate created no second transition" (Psql-Scalar "SELECT COUNT(*) FROM public.rfq_operational_status WHERE rfq_id = '$RFQ_OK'::uuid AND new_status = 'vendor_quote_received'") "1"

Write-Host ""
Write-Host "CASE 5: vendor authority negative paths"
$uninvited = Invoke-Submit $jwt $RFQ_UNINVITED $ORG_VEND
Check-Blocked "uninvited vendor rejected" $uninvited
$wrongOrg = Invoke-Submit $jwt $RFQ_DIRECT_WRITE $ORG_OTHER
Check-Blocked "wrong vendor organization rejected" $wrongOrg
$archivedMembership = Invoke-Submit $jwt $RFQ_ARCHIVED_MEMBERSHIP $ORG_ARCHIVED_MEMBERSHIP
Check-Blocked "archived membership rejected" $archivedMembership
$archivedOrg = Invoke-Submit $jwt $RFQ_ARCHIVED_ORG $ORG_ARCHIVED
Check-Blocked "archived organization rejected" $archivedOrg
$customerOrg = Invoke-Submit $jwt $RFQ_CUSTOMER_ORG $ORG_CUSTOMER_ONLY
Check-Blocked "customer-only organization rejected" $customerOrg
$simMismatch = Invoke-Submit $jwt $RFQ_SIM_MISMATCH $ORG_SIMULATED
Check-Blocked "demo/real actor-data mismatch rejected" $simMismatch
$negativeCount = Psql-Scalar "SELECT COUNT(*) FROM public.vendor_quote_responses WHERE rfq_id IN ('$RFQ_UNINVITED'::uuid, '$RFQ_DIRECT_WRITE'::uuid, '$RFQ_ARCHIVED_MEMBERSHIP'::uuid, '$RFQ_ARCHIVED_ORG'::uuid, '$RFQ_CUSTOMER_ORG'::uuid, '$RFQ_SIM_MISMATCH'::uuid)"
Check "authority failures persisted no quotes" $negativeCount "0"

Write-Host ""
Write-Host "CASE 6: failed transition rolls back preceding quote INSERT"
$wrongState = Invoke-Submit $jwt $RFQ_WRONG_STATE $ORG_VEND
Check-Blocked "wrong RFQ state rejected by transition" $wrongState
Check "failed transition rolled back quote" (Psql-Scalar "SELECT COUNT(*) FROM public.vendor_quote_responses WHERE rfq_id = '$RFQ_WRONG_STATE'::uuid") "0"
Check "failed transition wrote no audit event" (Psql-Scalar "SELECT COUNT(*) FROM public.audit_events WHERE related_rfq_id = '$RFQ_WRONG_STATE'::uuid") "0"

Write-Host ""
Write-Host "CASE 7: direct authenticated table writes are blocked"
$directInsert = Invoke-REST "Post" "vendor_quote_responses" $jwt @{
    rfq_id = $RFQ_DIRECT_WRITE
    vendor_organization_id = $ORG_VEND
    submitted_by = $USER_VEND
    status = "submitted"
    daily_rate = 1
    is_simulated = $false
}
Check "direct REST INSERT returns 403" $directInsert.status 403
Check "direct INSERT persisted no row" (Psql-Scalar "SELECT COUNT(*) FROM public.vendor_quote_responses WHERE rfq_id = '$RFQ_DIRECT_WRITE'::uuid") "0"
$directUpdate = Invoke-REST "Patch" "vendor_quote_responses" $jwt @{ status = "withdrawn" } "?id=eq.$quoteId"
Check "direct REST UPDATE returns 403" $directUpdate.status 403
Check "direct UPDATE left quote unchanged" (Psql-Scalar "SELECT status FROM public.vendor_quote_responses WHERE id = '$quoteId'::uuid") "submitted"
$privileges = Psql-Scalar "SELECT has_table_privilege('authenticated','public.vendor_quote_responses','INSERT') || '|' || has_table_privilege('authenticated','public.vendor_quote_responses','UPDATE') || '|' || has_table_privilege('anon','public.vendor_quote_responses','INSERT') || '|' || has_table_privilege('anon','public.vendor_quote_responses','UPDATE')"
Check "INSERT/UPDATE table privileges revoked" $privileges "false|false|false|false"

Write-Host ""
Write-Host "Post-run cleanup..."
Invoke-Cleanup
$remaining = Psql-Scalar "SELECT COUNT(*) FROM public.rental_requests WHERE id::text LIKE 'b6b60005-%'"
Check "fixture cleanup complete" $remaining "0"

$total = $script:PASS + $script:FAIL
Write-Host ""
Write-Host "============================================================"
Write-Host "RESULT: $($script:PASS) / $total passed"
if ($script:FAIL -gt 0) { Write-Host "FAILURES: $($script:FAIL)" }
Write-Host "============================================================"

if ($script:FAIL -gt 0) { exit 1 }
