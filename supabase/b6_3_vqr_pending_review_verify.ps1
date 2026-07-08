# B6-3 / B6-4 VQR Pending-Review + Invitation Authority Runtime Verification  -  LOCAL ONLY
#
# Proves the runtime behavior of policy vqr_insert_vendor after
# migration 20260701000000_b6_3_vqr_insert_pending_review_check.sql and
# migration 20260708000000_b6_4_rfq_vendor_invitations.sql:
#
#   Case A: vendor JWT with an active rfq_vendor_invitations row -> RFQ A
#           becomes visible via rental_requests, and VQR INSERT succeeds.
#   Case B: vendor JWT -> VQR INSERT fails (403) when the target
#           rental_requests row has operational_status = 'vendor_quote_received'.
#   Case C: vendor JWT -> VQR INSERT fails (403) when the target
#           rental_requests row has operational_status = 'pending_vendor_review'
#           but NO rfq_vendor_invitations row exists. Proves invitation
#           authority is load-bearing, not merely a visibility helper.
#
# The tested INSERT uses only the vendor JWT + anon key via PostgREST.
# The admin/service key is used only for auth-user setup, scalar
# verification via docker/psql, and cleanup -- never for the tested INSERT.
#
# Run from repo root: powershell -ExecutionPolicy Bypass -File supabase/b6_3_vqr_pending_review_verify.ps1
# Requires: Docker running, local Supabase running (supabase start)

# ---- Configuration ----------------------------------------------------------

$API_URL   = "http://127.0.0.1:54321"
$REST_URL  = "$API_URL/rest/v1"
$PASSWORD  = "TestPass123!"
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
    Write-Host "  Remote project encqbibzgoarvtcivgra must never be called by this script."
    exit 1
}

# ---- B6-3 deterministic UUIDs -----------------------------------------------
# Prefix b6b60003  -  will not conflict with b6_2_vendor_authority_verify.ps1
# (b6b60002...), membership_verify.ps1 (c0.../d0.../f0...), or
# gate2_tests.ps1 (11111111.../22222222.../33333333...)

$B63_USER_CUST = "b6b60003-0000-0000-0000-000000000001"
$B63_USER_VEND = "b6b60003-0000-0000-0000-000000000002"
$B63_ORG_CUST  = "b6b60003-0000-0000-0000-000000000011"
$B63_ORG_VEND  = "b6b60003-0000-0000-0000-000000000012"
$B63_RFQ_A     = "b6b60003-0000-0000-0000-000000000021"
$B63_RFQ_B     = "b6b60003-0000-0000-0000-000000000022"
$B63_RFQ_C     = "b6b60003-0000-0000-0000-000000000023"

# ---- Counters ---------------------------------------------------------------

$script:PASS = 0
$script:FAIL = 0

# ---- Helpers (patterns from b6_2_vendor_authority_verify.ps1) ---------------

function Get-JWT($email) {
    $body = @{ email = $email; password = $PASSWORD } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Post `
        -Uri "$API_URL/auth/v1/token?grant_type=password" `
        -Headers @{ apikey = $ANON_KEY; "Content-Type" = "application/json" } `
        -Body $body
    return $resp.access_token
}

function Invoke-REST($method, $path, $jwt, $bodyObj, $query) {
    $hdrs = @{ apikey = $ANON_KEY; "Content-Type" = "application/json" }
    if ($jwt) { $hdrs["Authorization"] = "Bearer $jwt" }
    $url = "$REST_URL/$path"
    if ($query) { $url = "$url$query" }
    $bodyJson = if ($bodyObj) { $bodyObj | ConvertTo-Json } else { $null }
    try {
        $params = @{ Method = $method; Uri = $url; Headers = $hdrs }
        if ($bodyJson) { $params["Body"] = $bodyJson }
        $resp = Invoke-RestMethod @params
        return @{ status = 200; body = $resp; rawBody = ($resp | ConvertTo-Json -Depth 10 -Compress) }
    } catch {
        $httpResp = $null
        if ($_.Exception.PSObject.Properties.Name -contains "Response") { $httpResp = $_.Exception.Response }

        $code = 0
        $hdrs2 = @{}
        if ($httpResp) {
            try { $code = [int]$httpResp.StatusCode } catch { $code = 0 }
            try { foreach ($k in $httpResp.Headers.AllKeys) { $hdrs2[$k] = $httpResp.Headers[$k] } } catch { }
        }

        # ErrorDetails.Message is populated by Invoke-RestMethod from the response
        # body BEFORE it disposes the underlying stream. Reading the stream
        # directly here can return empty because Invoke-RestMethod already
        # consumed/closed it. ErrorDetails is the reliable source.
        $text = $null
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $text = $_.ErrorDetails.Message
        } elseif ($httpResp) {
            try {
                $stream = $httpResp.GetResponseStream()
                $stream.Position = 0
                $reader = New-Object System.IO.StreamReader($stream)
                $text = $reader.ReadToEnd(); $reader.Close()
            } catch { $text = $null }
        }
        if (-not $text) { $text = "" }

        $parsed = $null
        if ($text) { try { $parsed = $text | ConvertFrom-Json } catch { $parsed = $null } }

        if (-not $httpResp) {
            return @{ status = 0; body = $null; error = $_.Exception.Message; rawBody = $text }
        }
        return @{ status = $code; body = $parsed; headers = $hdrs2; rawBody = $text }
    }
}

function Get-JwtSubject($jwt) {
    try {
        $parts = $jwt.Split(".")
        $payload = $parts[1].Replace("-", "+").Replace("_", "/")
        switch ($payload.Length % 4) { 2 { $payload += "==" } 3 { $payload += "=" } }
        $json = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payload))
        return ($json | ConvertFrom-Json).sub
    } catch { return "(unable to decode)" }
}

function Check($label, $got, $want) {
    if ($got -eq $want) {
        $script:PASS++
        Write-Host "  PASS  $label"
    } else {
        $script:FAIL++
        Write-Host "  FAIL  $label  (expected '$want', got '$got')"
    }
}

function Psql-Scalar($sql) {
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
    return (docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -t -c $sql 2>&1).Trim()
}

function Psql-File($sql) {
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($sql)
    $tmp   = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllBytes($tmp, $bytes)
    docker cp $tmp supabase_db_encqbibzgoarvtcivgra:/tmp/b63_scratch.sql | Out-Null
    docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -f /tmp/b63_scratch.sql 2>&1
}

function New-AuthUser($id, $email) {
    $body = @{ id = $id; email = $email; password = $PASSWORD; email_confirm = $true } | ConvertTo-Json
    try {
        Invoke-RestMethod -Method Post `
            -Uri "$API_URL/auth/v1/admin/users" `
            -Headers @{ apikey = $ADMIN_KEY; "Content-Type" = "application/json" } `
            -Body $body | Out-Null
    } catch { }
}

function Remove-AuthUser($id) {
    try {
        Invoke-RestMethod -Method Delete `
            -Uri "$API_URL/auth/v1/admin/users/$id" `
            -Headers @{ apikey = $ADMIN_KEY } | Out-Null
    } catch { }
}

# ---- Cleanup ----------------------------------------------------------------
# Targets only B6-3 UUIDs. Safe to run before and after the test.
# Order respects FK constraints: vqr -> rfq -> memberships -> orgs -> auth users.

function Invoke-Cleanup {
    $cleanupSql = @(
        "DELETE FROM public.vendor_quote_responses WHERE rfq_id IN ('$B63_RFQ_A'::uuid, '$B63_RFQ_B'::uuid, '$B63_RFQ_C'::uuid);"
        "DELETE FROM public.rfq_vendor_invitations WHERE rfq_id IN ('$B63_RFQ_A'::uuid, '$B63_RFQ_B'::uuid, '$B63_RFQ_C'::uuid);"
        "DELETE FROM public.rental_requests WHERE id IN ('$B63_RFQ_A'::uuid, '$B63_RFQ_B'::uuid, '$B63_RFQ_C'::uuid);"
        "DELETE FROM public.organization_memberships WHERE user_id IN ('$B63_USER_CUST'::uuid, '$B63_USER_VEND'::uuid);"
        "DELETE FROM public.organizations WHERE id IN ('$B63_ORG_CUST'::uuid, '$B63_ORG_VEND'::uuid);"
    ) -join "`n"
    Psql-File $cleanupSql
    Remove-AuthUser $B63_USER_CUST
    Remove-AuthUser $B63_USER_VEND
}

# =============================================================================
# MAIN
# =============================================================================

Write-Host ""
Write-Host "========================================"
Write-Host "B6-3 VQR Pending-Review Runtime Verification"
Write-Host "LOCAL ONLY  -  $API_URL"
Write-Host "========================================"

# ---- Pre-run cleanup --------------------------------------------------------

Write-Host ""
Write-Host "Pre-run cleanup..."
Invoke-Cleanup
Write-Host "  Pre-run cleanup done."

# ---- Setup: auth users ------------------------------------------------------

Write-Host ""
Write-Host "Creating B6-3 auth users..."
New-AuthUser $B63_USER_CUST "b63-customer@test.local"
New-AuthUser $B63_USER_VEND "b63-vendor@test.local"
Write-Host "  Auth users created."
Write-Host "  Customer user: $B63_USER_CUST"
Write-Host "  Vendor user:   $B63_USER_VEND"

# ---- Setup: SQL fixture -----------------------------------------------------

Write-Host ""
Write-Host "Seeding B6-3 fixture..."
$fixtureSql = @"
INSERT INTO public.organizations (id, name, org_type, is_simulated) VALUES
  ('$B63_ORG_CUST', 'B63 Test Customer Org', 'customer', false),
  ('$B63_ORG_VEND', 'B63 Test Vendor Org', 'vendor', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.organization_memberships (organization_id, user_id, role) VALUES
  ('$B63_ORG_CUST', '$B63_USER_CUST', 'owner'),
  ('$B63_ORG_VEND', '$B63_USER_VEND', 'member')
ON CONFLICT (organization_id, user_id) DO NOTHING;
INSERT INTO public.rental_requests
  (id, customer_id, customer_organization_id, operational_status, is_simulated)
VALUES
  ('$B63_RFQ_A', '$B63_USER_CUST', '$B63_ORG_CUST', 'pending_vendor_review', false),
  ('$B63_RFQ_B', '$B63_USER_CUST', '$B63_ORG_CUST', 'vendor_quote_received', false),
  ('$B63_RFQ_C', '$B63_USER_CUST', '$B63_ORG_CUST', 'pending_vendor_review', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.rfq_vendor_invitations
  (rfq_id, vendor_organization_id, invited_by, invitation_status, is_simulated)
VALUES
  ('$B63_RFQ_A', '$B63_ORG_VEND', '$B63_USER_CUST', 'invited', true)
ON CONFLICT DO NOTHING;
"@
Psql-File $fixtureSql
Write-Host "  Fixture seeded."
Write-Host "  RFQ A: $B63_RFQ_A  operational_status: pending_vendor_review  (invitation seeded)"
Write-Host "  RFQ B: $B63_RFQ_B  operational_status: vendor_quote_received"
Write-Host "  RFQ C: $B63_RFQ_C  operational_status: pending_vendor_review  (no invitation)"
Write-Host "  Vendor org: $B63_ORG_VEND"

$invitationA_count  = Psql-Scalar "SELECT COUNT(*) FROM public.rfq_vendor_invitations WHERE rfq_id = '$B63_RFQ_A'::uuid AND vendor_organization_id = '$B63_ORG_VEND'::uuid AND invitation_status = 'invited'"
$invitationA_seeded = ($invitationA_count -eq "1")
Write-Host "  RFQ A invitation seeded: $invitationA_seeded"

# ---- Acquire vendor JWT -----------------------------------------------------

Write-Host ""
Write-Host "Acquiring vendor JWT..."
try {
    $jwt_vend = Get-JWT "b63-vendor@test.local"
} catch {
    Write-Host "FATAL: Could not acquire vendor JWT: $($_.Exception.Message)"
    Write-Host "  Check that local Supabase is running and auth user was created."
    Invoke-Cleanup
    exit 1
}
if (-not $jwt_vend) {
    Write-Host "FATAL: Vendor JWT is null. Auth user may not have been created."
    Invoke-Cleanup
    exit 1
}
Write-Host "  Vendor JWT acquired."
$jwt_vend_sub = Get-JwtSubject $jwt_vend
Write-Host "  Vendor JWT sub: $jwt_vend_sub"
Write-Host ""

# =============================================================================
# VENDOR RFQ A READ DIAGNOSTIC (pre-Case-A)
# Determines whether the vendor JWT can see RFQ A through rental_requests
# before the Case A INSERT is attempted.
# =============================================================================

Write-Host "VENDOR RFQ A READ DIAGNOSTIC"
Write-Host "  GET /rest/v1/rental_requests?id=eq.$B63_RFQ_A&select=id,operational_status  (vendor JWT, RLS applies)"

$r_rfqARead = Invoke-REST "Get" "rental_requests" $jwt_vend $null "?id=eq.$B63_RFQ_A&select=id,operational_status"

$rfqARead_visible = $false
$rfqARead_status  = "(none)"
if ($r_rfqARead.status -eq 200 -and $r_rfqARead.body -and $r_rfqARead.body.Count -gt 0) {
    $rfqARead_visible = $true
    $rfqARead_status  = $r_rfqARead.body[0].operational_status
}

Write-Host "  HTTP Status:        $($r_rfqARead.status)"
Write-Host "  Raw Response Body:  $($r_rfqARead.rawBody)"
$parsedReadDump = if ($r_rfqARead.body -ne $null) { $r_rfqARead.body | ConvertTo-Json -Depth 10 -Compress } else { "(null)" }
Write-Host "  Parsed Response:    $parsedReadDump"
Write-Host "  RFQ A visible to vendor JWT: $rfqARead_visible"
Write-Host "  RFQ A status:                $rfqARead_status"
Write-Host ""

# =============================================================================
# CASE A: VQR INSERT via vendor JWT against rfq_id in pending_vendor_review
# Expected: HTTP 200/201, row persists.
# =============================================================================

Write-Host "CASE A: VQR INSERT  -  rfq operational_status = pending_vendor_review"
Write-Host "  POST /rest/v1/vendor_quote_responses  (vendor JWT, RLS applies)"

$vqrBodyA = @{
    rfq_id                 = $B63_RFQ_A
    vendor_organization_id = $B63_ORG_VEND
    submitted_by           = $B63_USER_VEND
    status                 = "submitted"
    daily_rate             = 1500.00
    compliance_confirmed   = $true
    submitted_at           = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
}
$r_vqrA = Invoke-REST "Post" "vendor_quote_responses" $jwt_vend $vqrBodyA $null

$caseA_ok = $false
if ($r_vqrA.status -eq 0) {
    $script:FAIL++
    Write-Host "  FAIL  CASE A: connection error  -  $($r_vqrA.error)"
    Write-Host "        DIAGNOSIS: Is local Supabase running?"
} elseif ($r_vqrA.status -eq 403) {
    $script:FAIL++
    Write-Host "  FAIL  CASE A: 403  -  RLS vqr_insert_vendor blocked the insert."
    Write-Host "        --- CASE A FAILURE EVIDENCE ---"
    Write-Host "        HTTP Status:       $($r_vqrA.status)"
    Write-Host "        Raw Response Body: $($r_vqrA.rawBody)"
    $bodyDump = if ($r_vqrA.body -ne $null) { $r_vqrA.body | ConvertTo-Json -Depth 10 -Compress } else { "(unparseable / no body)" }
    Write-Host "        Parsed Response Body: $bodyDump"
    if ($r_vqrA.headers) {
        Write-Host "        Response Headers:"
        foreach ($h in $r_vqrA.headers.Keys) { Write-Host "          $($h): $($r_vqrA.headers[$h])" }
    } else {
        Write-Host "        Response Headers: (not captured)"
    }
    Write-Host "        Payload Sent:   $($vqrBodyA | ConvertTo-Json -Compress)"
    Write-Host "        submitted_by:            $($vqrBodyA.submitted_by)"
    Write-Host "        JWT sub:                 $jwt_vend_sub"
    Write-Host "        rfq_id:                  $($vqrBodyA.rfq_id)"
    Write-Host "        vendor_organization_id:  $($vqrBodyA.vendor_organization_id)"
    Write-Host "        status:                  $($vqrBodyA.status)"
    Write-Host "        --- END CASE A FAILURE EVIDENCE ---"
} elseif ($r_vqrA.status -ne 200) {
    $script:FAIL++
    $errMsg = if ($r_vqrA.body) { $r_vqrA.body | ConvertTo-Json -Compress } else { "(no body)" }
    Write-Host "  FAIL  CASE A: unexpected status $($r_vqrA.status)  -  $errMsg"
} else {
    $script:PASS++
    Write-Host "  PASS  CASE A INSERT succeeded (vendor JWT, pending_vendor_review)"
    $caseA_ok = $true
}

$vqrA_count = "0"
if ($caseA_ok) {
    $vqrA_count = Psql-Scalar "SELECT COUNT(*) FROM public.vendor_quote_responses WHERE rfq_id = '$B63_RFQ_A'::uuid AND vendor_organization_id = '$B63_ORG_VEND'::uuid AND status = 'submitted'"
    Check "CASE A: VQR row in DB for RFQ A" $vqrA_count "1"
}

$caseA_result = if ($caseA_ok -and $vqrA_count -eq "1") { "PASS" } else { "FAIL" }
Write-Host "  CASE A RESULT: $caseA_result"

# =============================================================================
# CASE B: VQR INSERT via vendor JWT against rfq_id NOT in pending_vendor_review
# Expected: HTTP 403, no row persists.
# =============================================================================

Write-Host ""
Write-Host "CASE B: VQR INSERT  -  rfq operational_status = vendor_quote_received"
Write-Host "  POST /rest/v1/vendor_quote_responses  (vendor JWT, RLS applies)"

$vqrBodyB = @{
    rfq_id                 = $B63_RFQ_B
    vendor_organization_id = $B63_ORG_VEND
    submitted_by           = $B63_USER_VEND
    status                 = "submitted"
    daily_rate             = 1500.00
    compliance_confirmed   = $true
    submitted_at           = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
}
$r_vqrB = Invoke-REST "Post" "vendor_quote_responses" $jwt_vend $vqrBodyB $null

if ($r_vqrB.status -eq 0) {
    $script:FAIL++
    Write-Host "  FAIL  CASE B: connection error  -  $($r_vqrB.error)"
    Write-Host "        DIAGNOSIS: Is local Supabase running?"
} elseif ($r_vqrB.status -eq 403) {
    $script:PASS++
    Write-Host "  PASS  CASE B correctly blocked (403)  -  RLS enforced pending_vendor_review requirement"
} elseif ($r_vqrB.status -eq 200) {
    $script:FAIL++
    Write-Host "  FAIL  CASE B: 200  -  INSERT incorrectly succeeded against a non-pending RFQ."
    Write-Host "        DIAGNOSIS (CRITICAL): pending_vendor_review check is not enforced at runtime."
} else {
    $script:FAIL++
    $errMsg = if ($r_vqrB.body) { $r_vqrB.body | ConvertTo-Json -Compress } else { "(no body)" }
    Write-Host "  FAIL  CASE B: unexpected status $($r_vqrB.status)  -  $errMsg"
}

$vqrB_count = Psql-Scalar "SELECT COUNT(*) FROM public.vendor_quote_responses WHERE rfq_id = '$B63_RFQ_B'::uuid AND vendor_organization_id = '$B63_ORG_VEND'::uuid"
Check "CASE B: no VQR row in DB for RFQ B" $vqrB_count "0"

$caseB_blocked = ($r_vqrB.status -eq 403)
$caseB_result  = if ($caseB_blocked -and $vqrB_count -eq "0") { "PASS" } else { "FAIL" }
Write-Host "  CASE B RESULT: $caseB_result"

# =============================================================================
# CASE C: VQR INSERT via vendor JWT against rfq_id in pending_vendor_review
# with NO active rfq_vendor_invitations row.
# Expected: HTTP 403, no row persists.
# Proves rfq_vendor_invitations is load-bearing authority, not merely a
# visibility helper -- pending_vendor_review status alone is insufficient.
# =============================================================================

Write-Host ""
Write-Host "CASE C: VQR INSERT  -  rfq operational_status = pending_vendor_review, no invitation"
Write-Host "  POST /rest/v1/vendor_quote_responses  (vendor JWT, RLS applies)"

$vqrBodyC = @{
    rfq_id                 = $B63_RFQ_C
    vendor_organization_id = $B63_ORG_VEND
    submitted_by           = $B63_USER_VEND
    status                 = "submitted"
    daily_rate             = 1500.00
    compliance_confirmed   = $true
    submitted_at           = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
}
$r_vqrC = Invoke-REST "Post" "vendor_quote_responses" $jwt_vend $vqrBodyC $null

if ($r_vqrC.status -eq 0) {
    $script:FAIL++
    Write-Host "  FAIL  CASE C: connection error  -  $($r_vqrC.error)"
    Write-Host "        DIAGNOSIS: Is local Supabase running?"
} elseif ($r_vqrC.status -eq 403) {
    $script:PASS++
    Write-Host "  PASS  CASE C correctly blocked (403)  -  RLS enforced invitation requirement"
} elseif ($r_vqrC.status -eq 200) {
    $script:FAIL++
    Write-Host "  FAIL  CASE C: 200  -  INSERT incorrectly succeeded against a pending RFQ with no invitation."
    Write-Host "        DIAGNOSIS (CRITICAL): rfq_vendor_invitations is not enforced at runtime; pending_vendor_review alone is being treated as sufficient."
} else {
    $script:FAIL++
    $errMsg = if ($r_vqrC.body) { $r_vqrC.body | ConvertTo-Json -Compress } else { "(no body)" }
    Write-Host "  FAIL  CASE C: unexpected status $($r_vqrC.status)  -  $errMsg"
}

$vqrC_count = Psql-Scalar "SELECT COUNT(*) FROM public.vendor_quote_responses WHERE rfq_id = '$B63_RFQ_C'::uuid AND vendor_organization_id = '$B63_ORG_VEND'::uuid"
Check "CASE C: no VQR row in DB for RFQ C" $vqrC_count "0"

$caseC_blocked = ($r_vqrC.status -eq 403)
$caseC_result  = if ($caseC_blocked -and $vqrC_count -eq "0") { "PASS" } else { "FAIL" }
Write-Host "  CASE C RESULT: $caseC_result"

# =============================================================================
# Post-run cleanup
# =============================================================================

Write-Host ""
Write-Host "Post-run cleanup..."
Invoke-Cleanup
$cleanup_vqr_count = Psql-Scalar "SELECT COUNT(*) FROM public.vendor_quote_responses WHERE rfq_id IN ('$B63_RFQ_A'::uuid, '$B63_RFQ_B'::uuid, '$B63_RFQ_C'::uuid)"
$cleanup_inv_count = Psql-Scalar "SELECT COUNT(*) FROM public.rfq_vendor_invitations WHERE rfq_id IN ('$B63_RFQ_A'::uuid, '$B63_RFQ_B'::uuid, '$B63_RFQ_C'::uuid)"
$cleanup_rfq_count = Psql-Scalar "SELECT COUNT(*) FROM public.rental_requests WHERE id IN ('$B63_RFQ_A'::uuid, '$B63_RFQ_B'::uuid, '$B63_RFQ_C'::uuid)"
$cleanup_result    = if ($cleanup_vqr_count -eq "0" -and $cleanup_inv_count -eq "0" -and $cleanup_rfq_count -eq "0") { "PASS" } else { "FAIL" }
Write-Host "  Cleanup done."
Write-Host "  Cleanup verification -- vendor_quote_responses: $cleanup_vqr_count  rfq_vendor_invitations: $cleanup_inv_count  rental_requests: $cleanup_rfq_count"
Write-Host "  CLEANUP RESULT: $cleanup_result"

# =============================================================================
# Summary
# =============================================================================

$total = $script:PASS + $script:FAIL
$overall_result = if ($caseA_result -eq "PASS" -and $caseB_result -eq "PASS" -and $caseC_result -eq "PASS" -and $cleanup_result -eq "PASS") { "PASS" } else { "FAIL" }

Write-Host ""
Write-Host "========================================"
Write-Host "B6-3 / B6-4 VQR + Invitation Authority Runtime Verification"
Write-Host "LOCAL ONLY  -  $API_URL"
Write-Host "RFQ A (pending_vendor_review, invited):      $B63_RFQ_A"
Write-Host "RFQ B (vendor_quote_received):                $B63_RFQ_B"
Write-Host "RFQ C (pending_vendor_review, not invited):   $B63_RFQ_C"
Write-Host "Vendor user: $B63_USER_VEND"
Write-Host "Vendor org:  $B63_ORG_VEND"
Write-Host ""
Write-Host "RFQ A invitation seeded:     $invitationA_seeded"
Write-Host "RFQ A visible to vendor JWT: $rfqARead_visible"
Write-Host "Case A result: $caseA_result"
Write-Host "Case B result: $caseB_result"
Write-Host "Case C result: $caseC_result"
Write-Host "Cleanup result: $cleanup_result"
Write-Host "Overall result: $overall_result"
Write-Host ""
Write-Host "RESULT: $($script:PASS) / $total passed"
if ($script:FAIL -gt 0) {
    Write-Host "FAILURES: $($script:FAIL)"
    Write-Host ""
    Write-Host "Diagnostics:"
    Write-Host "  All steps failed:      Check Docker and local Supabase are running."
    Write-Host "  CASE A 403:            invitation or pending_vendor_review check misfiring on a compliant RFQ."
    Write-Host "  CASE B 200:            pending_vendor_review check not enforced (CRITICAL)."
    Write-Host "  CASE C 200:            rfq_vendor_invitations check not enforced (CRITICAL)."
}
Write-Host "========================================"
