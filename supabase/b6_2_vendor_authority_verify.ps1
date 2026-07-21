# B6-2 Vendor Authority Verification  -  LOCAL ONLY
#
# Verifies the real B6-2 vendor path:
#   vendor JWT -> VQR INSERT (status='submitted') -> rfq-transition (vendor_quote_received)
#   -> Edge Function vendor authority check -> transition_rfq_status()
#   -> rental_requests.operational_status = 'vendor_quote_received'
#   -> audit_events (source='vendor_action') -> rfq_operational_status
#
# Run from repo root: powershell -File supabase/b6_2_vendor_authority_verify.ps1
# Requires: Docker running, local Supabase running (supabase start), supabase functions serve

# ---- Configuration ----------------------------------------------------------

$API_URL   = "http://127.0.0.1:54321"
$FN_URL    = "$API_URL/functions/v1/rfq-transition"
$REST_URL  = "$API_URL/rest/v1"
$PASSWORD  = "TestPass123!"
$ANON_KEY  = $env:SUPABASE_ANON_KEY
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

# ---- B6-2 deterministic UUIDs -----------------------------------------------
# Prefix b6b60002  -  will not conflict with membership_verify.ps1 (c0.../d0.../f0...)
# or gate2_tests.ps1 (11111111.../22222222.../33333333...)

$B6_USER_CUST = "b6b60002-0000-0000-0000-000000000001"
$B6_USER_VEND = "b6b60002-0000-0000-0000-000000000002"
$B6_ORG_CUST  = "b6b60002-0000-0000-0000-000000000011"
$B6_ORG_VEND  = "b6b60002-0000-0000-0000-000000000012"
$B6_RFQ       = "b6b60002-0000-0000-0000-000000000021"

# ---- Counters ---------------------------------------------------------------

$script:PASS = 0
$script:FAIL = 0

# ---- Helpers (patterns from membership_verify.ps1) --------------------------

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

    # ErrorDetails.Message is populated by Invoke-RestMethod from the response
    # body before the underlying stream is disposed; prefer it over re-reading
    # the (possibly already-consumed) stream directly.
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
    docker cp $tmp supabase_db_encqbibzgoarvtcivgra:/tmp/b62_scratch.sql | Out-Null
    docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -f /tmp/b62_scratch.sql 2>&1
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

# ---- Cleanup ----------------------------------------------------------------
# Targets only B6-2 UUIDs. Safe to run before and after the test.
# Order respects FK constraints: audit/status/vqr -> rfq -> memberships -> orgs -> auth users.

function Invoke-Cleanup {
    $cleanupSql = @(
        "DELETE FROM public.audit_events WHERE related_rfq_id = '$B6_RFQ'::uuid;"
        "DELETE FROM public.rfq_operational_status WHERE rfq_id = '$B6_RFQ'::uuid;"
        "DELETE FROM public.vendor_quote_responses WHERE rfq_id = '$B6_RFQ'::uuid;"
        "DELETE FROM public.rfq_vendor_invitations WHERE rfq_id = '$B6_RFQ'::uuid;"
        "DELETE FROM public.rental_requests WHERE id = '$B6_RFQ'::uuid;"
        "DELETE FROM public.organization_memberships WHERE user_id IN ('$B6_USER_CUST'::uuid, '$B6_USER_VEND'::uuid);"
        "DELETE FROM public.organizations WHERE id IN ('$B6_ORG_CUST'::uuid, '$B6_ORG_VEND'::uuid);"
    ) -join "`n"
    Psql-File $cleanupSql
    Remove-AuthUser $B6_USER_CUST
    Remove-AuthUser $B6_USER_VEND
}

# =============================================================================
# MAIN
# =============================================================================

Write-Host ""
Write-Host "========================================"
Write-Host "B6-2 Vendor Authority Verification"
Write-Host "LOCAL ONLY  -  $API_URL"
Write-Host "========================================"

# ---- Pre-run cleanup --------------------------------------------------------

Write-Host ""
Write-Host "Pre-run cleanup..."
Invoke-Cleanup
Write-Host "  Pre-run cleanup done."

# ---- Setup: auth users ------------------------------------------------------

Write-Host ""
Write-Host "Creating B6-2 auth users..."
New-AuthUser $B6_USER_CUST "b62-customer@test.local"
New-AuthUser $B6_USER_VEND "b62-vendor@test.local"
Write-Host "  Auth users created."
Write-Host "  Customer user: $B6_USER_CUST"
Write-Host "  Vendor user:   $B6_USER_VEND"

# ---- Setup: SQL fixture -----------------------------------------------------

Write-Host ""
Write-Host "Seeding B6-2 fixture..."
$fixtureSql = @"
INSERT INTO public.organizations (id, name, org_type, is_simulated) VALUES
  ('$B6_ORG_CUST', 'B62 Test Customer Org', 'customer', false),
  ('$B6_ORG_VEND', 'B62 Test Vendor Org', 'vendor', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.organization_memberships (organization_id, user_id, role) VALUES
  ('$B6_ORG_CUST', '$B6_USER_CUST', 'owner'),
  ('$B6_ORG_VEND', '$B6_USER_VEND', 'member')
ON CONFLICT (organization_id, user_id) DO NOTHING;
INSERT INTO public.rental_requests
  (id, customer_id, customer_organization_id, operational_status, is_simulated)
VALUES
  ('$B6_RFQ', '$B6_USER_CUST', '$B6_ORG_CUST', 'pending_vendor_review', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.rfq_vendor_invitations
  (rfq_id, vendor_organization_id, invited_by, invitation_status, is_simulated)
VALUES
  ('$B6_RFQ', '$B6_ORG_VEND', '$B6_USER_CUST', 'invited', false)
ON CONFLICT DO NOTHING;
"@
Psql-File $fixtureSql
Write-Host "  Fixture seeded."
Write-Host "  RFQ: $B6_RFQ  starting: pending_vendor_review"
Write-Host "  Vendor org: $B6_ORG_VEND"

# ---- Acquire vendor JWT -----------------------------------------------------

Write-Host ""
Write-Host "Acquiring vendor JWT..."
try {
    $jwt_vend = Get-JWT "b62-vendor@test.local"
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
Write-Host ""

# =============================================================================
# STEP 1: VQR INSERT via vendor JWT
# Authority: vendor JWT -> PostgREST -> RLS vqr_insert_vendor
# Admin/service key is NOT used here. This proves RLS allows the vendor user.
# =============================================================================

Write-Host "STEP 1: VQR INSERT via vendor JWT"
Write-Host "  POST /rest/v1/vendor_quote_responses  (vendor JWT, RLS applies)"

$vqrBody = @{
    rfq_id                 = $B6_RFQ
    vendor_organization_id = $B6_ORG_VEND
    submitted_by           = $B6_USER_VEND
    status                 = "submitted"
    daily_rate             = 1500.00
    compliance_confirmed   = $true
    submitted_at           = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
}
$r_vqr = Invoke-REST "Post" "vendor_quote_responses" $jwt_vend $vqrBody $null

$vqr_ok = $false
if ($r_vqr.status -eq 0) {
    $script:FAIL++
    Write-Host "  FAIL  VQR INSERT: connection error  -  $($r_vqr.error)"
    Write-Host "        DIAGNOSIS: Is local Supabase running?"
} elseif ($r_vqr.status -eq 403) {
    $script:FAIL++
    Write-Host "  FAIL  VQR INSERT: 403  -  RLS vqr_insert_vendor blocked the insert."
    Write-Host "        DIAGNOSIS (Failure Mode A): Vendor user $B6_USER_VEND may have no"
    Write-Host "        active organization_memberships row for org $B6_ORG_VEND."
    Write-Host "        Check: role IN (owner,admin,member), archived_at IS NULL, correct org_id."
    Write-Host "        Also check: submitted_by = auth.uid() (must match the calling user)."
    Write-Host "        DIAGNOSIS (Failure Mode D): No 'invited' rfq_vendor_invitations row for"
    Write-Host "        rfq_id=$B6_RFQ and vendor_organization_id=$B6_ORG_VEND."
} elseif ($r_vqr.status -eq 409) {
    $script:FAIL++
    Write-Host "  FAIL  VQR INSERT: 409  -  unique constraint (rfq_id, vendor_org_id, version=1)."
    Write-Host "        DIAGNOSIS (Failure Mode C): Orphan VQR row exists from a prior run."
    Write-Host "        Pre-run cleanup should have removed it. Check for stale data."
} elseif ($r_vqr.status -ne 200) {
    $script:FAIL++
    $errMsg = if ($r_vqr.body) { $r_vqr.body | ConvertTo-Json -Compress } else { "(no body)" }
    Write-Host "  FAIL  VQR INSERT: unexpected status $($r_vqr.status)  -  $errMsg"
} else {
    $script:PASS++
    Write-Host "  PASS  VQR INSERT succeeded (vendor JWT)"
    $vqr_ok = $true
}

if ($vqr_ok) {
    $vqr_count = Psql-Scalar "SELECT COUNT(*) FROM public.vendor_quote_responses WHERE rfq_id = '$B6_RFQ'::uuid AND vendor_organization_id = '$B6_ORG_VEND'::uuid AND status = 'submitted'"
    Check "VQR row in DB: status=submitted, rfq and vendor_org match" $vqr_count "1"

    $vqr_sub = Psql-Scalar "SELECT submitted_by FROM public.vendor_quote_responses WHERE rfq_id = '$B6_RFQ'::uuid AND vendor_organization_id = '$B6_ORG_VEND'::uuid"
    Check "VQR.submitted_by = vendor user ID" $vqr_sub $B6_USER_VEND
}

# =============================================================================
# STEP 2: rfq-transition via vendor JWT
# Authority: vendor JWT only -> Edge Function -> transition_rfq_status()
# Admin/service key is NOT used for the transition call.
# This proves the Edge Function vendor authority check (index.ts lines 240-259).
# =============================================================================

Write-Host ""
Write-Host "STEP 2: rfq-transition via vendor JWT"
Write-Host "  POST /functions/v1/rfq-transition  { rfq_id, new_status: vendor_quote_received }"
Write-Host "  Authority: vendor JWT only (not admin)"

$tr_ok = $false
$correlation_id = $null

if ($vqr_ok) {
    $r_tr = Invoke-RF $jwt_vend $B6_RFQ "vendor_quote_received"

    if ($r_tr.status -eq 0) {
        $script:FAIL++
        Write-Host "  FAIL  rfq-transition: connection error  -  $($r_tr.error)"
        Write-Host "        DIAGNOSIS: Is supabase functions serve running?"
    } elseif ($r_tr.status -eq 403) {
        $script:FAIL++
        Write-Host "  FAIL  rfq-transition: 403  -  Edge Function denied vendor authority."
        Write-Host "        DIAGNOSIS: Edge Function (index.ts lines 240-259) could not find a"
        Write-Host "        submitted or revised VQR for rfq $B6_RFQ from vendor's org IDs."
        Write-Host "        Either VQR INSERT did not persist, or the vendor user has no"
        Write-Host "        organization_memberships row visible to the service_role query."
    } elseif ($r_tr.status -eq 422) {
        $script:FAIL++
        Write-Host "  FAIL  rfq-transition: 422  -  invalid transition."
        Write-Host "        DIAGNOSIS: RFQ $B6_RFQ is not in pending_vendor_review."
        Write-Host "        Check fixture seeding  -  starting status must be pending_vendor_review."
    } elseif ($r_tr.status -eq 500) {
        $script:FAIL++
        Write-Host "  FAIL  rfq-transition: 500  -  DB function error."
        Write-Host "        DIAGNOSIS: transition_rfq_status() likely rejected the call."
        Write-Host "        Check supabase functions serve logs and B5-1 migration allowlist."
    } elseif ($r_tr.status -ne 200) {
        $script:FAIL++
        $errMsg = if ($r_tr.body) { $r_tr.body | ConvertTo-Json -Compress } else { "(no body)" }
        Write-Host "  FAIL  rfq-transition: unexpected status $($r_tr.status)  -  $errMsg"
    } else {
        $script:PASS++
        $correlation_id = $r_tr.body.correlation_id
        Write-Host "  PASS  rfq-transition succeeded (vendor JWT)"
        if ($correlation_id) {
            Write-Host "        correlation_id: $correlation_id"
        } else {
            Write-Host "        WARNING: correlation_id missing from response body"
        }
        $tr_ok = $true
    }
} else {
    Write-Host "  SKIP  rfq-transition skipped  -  VQR INSERT failed in STEP 1"
}

# =============================================================================
# STEP 3: DB assertions
# Verify transition_rfq_status() wrote the correct rows.
# audit_events.source must be vendor_action, not admin_action.
# =============================================================================

Write-Host ""
Write-Host "STEP 3: DB assertions"

if ($tr_ok) {
    $rfq_status = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$B6_RFQ'::uuid"
    Check "rental_requests.operational_status = vendor_quote_received" $rfq_status "vendor_quote_received"

    if ($correlation_id) {
        $ae_count = Psql-Scalar "SELECT COUNT(*) FROM public.audit_events WHERE correlation_id = '$correlation_id'::uuid"
        Check "audit_events: row exists for correlation_id" $ae_count "1"

        $ae_source = Psql-Scalar "SELECT source FROM public.audit_events WHERE correlation_id = '$correlation_id'::uuid"
        if ($ae_source -eq "admin_action") {
            $script:FAIL++
            Write-Host "  FAIL  audit_events.source = admin_action (CRITICAL)"
            Write-Host "        Transition used admin authority, not vendor authority."
            Write-Host "        Vendor JWT was incorrectly resolved as admin. Test is invalid."
        } else {
            Check "audit_events.source = vendor_action" $ae_source "vendor_action"
        }

        $ros_count = Psql-Scalar "SELECT COUNT(*) FROM public.rfq_operational_status WHERE rfq_id = '$B6_RFQ'::uuid AND new_status = 'vendor_quote_received'"
        Check "rfq_operational_status: row exists (new_status=vendor_quote_received)" $ros_count "1"

        $ros_prev = Psql-Scalar "SELECT previous_status FROM public.rfq_operational_status WHERE rfq_id = '$B6_RFQ'::uuid AND new_status = 'vendor_quote_received'"
        Check "rfq_operational_status.previous_status = pending_vendor_review" $ros_prev "pending_vendor_review"
    } else {
        $script:FAIL++
        Write-Host "  FAIL  correlation_id missing  -  cannot verify audit_events or rfq_operational_status"
        Write-Host "        DIAGNOSIS: transition_rfq_status() may not have returned correctly."
    }
} else {
    Write-Host "  SKIP  DB assertions skipped  -  STEP 1 or STEP 2 failed"
    Write-Host "        Resolve upstream failures before DB assertions can be verified."
}

# =============================================================================
# Post-run cleanup
# =============================================================================

Write-Host ""
Write-Host "Post-run cleanup..."
Invoke-Cleanup
Write-Host "  Cleanup done."

# =============================================================================
# Summary
# =============================================================================

$total = $script:PASS + $script:FAIL
Write-Host ""
Write-Host "========================================"
Write-Host "B6-2 Vendor Authority Verification"
Write-Host "LOCAL ONLY  -  $API_URL"
Write-Host "RFQ ID:      $B6_RFQ"
Write-Host "Vendor user: $B6_USER_VEND"
Write-Host "Vendor org:  $B6_ORG_VEND"
if ($correlation_id) {
    Write-Host "Correlation: $correlation_id"
}
Write-Host ""
Write-Host "RESULT: $($script:PASS) / $total passed"
if ($script:FAIL -gt 0) {
    Write-Host "FAILURES: $($script:FAIL)"
    Write-Host ""
    Write-Host "Diagnostics:"
    Write-Host "  All steps failed:      Check Docker and local Supabase are running."
    Write-Host "  STEP 1 403:            Failure Mode A  -  vendor org membership missing or invalid."
    Write-Host "  STEP 1 403:            Failure Mode D  -  no 'invited' rfq_vendor_invitations row."
    Write-Host "  STEP 1 409:            Failure Mode C  -  orphan VQR from prior run."
    Write-Host "  STEP 2 403:            Edge Function vendor authority check failed."
    Write-Host "  STEP 2 422:            RFQ not in pending_vendor_review (fixture error)."
    Write-Host "  STEP 2 500:            DB function error in transition_rfq_status()."
    Write-Host "  source=admin_action:   Test invalid  -  vendor JWT resolved as admin."
}
Write-Host "========================================"
