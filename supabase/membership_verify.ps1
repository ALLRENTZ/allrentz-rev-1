# P1-2 Org Membership Authority Verification
# Scope: customer authority, vendor authority, admin authority,
#        source attribution, audit trail, membership write protection
# Run from repo root: powershell -File supabase/membership_verify.ps1
# Requires: all P1 migrations applied, supabase functions serve running

$ANON_KEY    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
$API_URL     = "http://127.0.0.1:54321"
$FN_URL      = "$API_URL/functions/v1/rfq-transition"
$REST_URL    = "$API_URL/rest/v1"
$PASSWORD    = "TestPass123!"
$ADMIN_KEY   = $env:SUPABASE_SERVICE_ROLE_KEY
if ([string]::IsNullOrWhiteSpace($ADMIN_KEY)) {
    throw "SUPABASE_SERVICE_ROLE_KEY environment variable is required. Do not hardcode service-role keys in this script."
}

$script:PASS = 0
$script:FAIL = 0

# ---- Fixed UUIDs --------------------------------------------------------

$USER_ADMIN       = "c0000000-0000-0000-0000-000000000001"
$USER_MANAGER     = "c0000000-0000-0000-0000-000000000002"
$USER_CUST_OWNER  = "c0000000-0000-0000-0000-000000000003"
$USER_CUST_MEMBER = "c0000000-0000-0000-0000-000000000004"
$USER_CUST_VIEWER = "c0000000-0000-0000-0000-000000000005"
$USER_CUST_ARCH   = "c0000000-0000-0000-0000-000000000006"
$USER_CUST_OTHER  = "c0000000-0000-0000-0000-000000000007"
$USER_NONMEMBER   = "c0000000-0000-0000-0000-000000000008"
$USER_VEND_ACC    = "c0000000-0000-0000-0000-000000000009"
$USER_VEND_SUB    = "c0000000-0000-0000-0000-000000000010"
$USER_VEND_OTHER  = "c0000000-0000-0000-0000-000000000011"
$USER_VEND_VIEW   = "c0000000-0000-0000-0000-000000000012"
$USER_VEND_ARCH   = "c0000000-0000-0000-0000-000000000013"

$ORG_CUST_A = "d0000000-0000-0000-0000-000000000001"
$ORG_CUST_B = "d0000000-0000-0000-0000-000000000002"
$ORG_VEND_X = "d0000000-0000-0000-0000-000000000003"
$ORG_VEND_Y = "d0000000-0000-0000-0000-000000000004"
$ORG_VEND_Z = "d0000000-0000-0000-0000-000000000005"

# f01: cust-owner success (starts draft)
# f02: cust-member success (starts draft)
# f03: customer rejection tests (stays draft throughout T03-T07)
# f04: vend-accepted success (starts submitted, has accepted quote from org X)
# f05: vendor rejection tests (stays submitted throughout T09-T13)
# f06: admin success (starts draft)
# f07: manager success (starts draft)
$RFQ_01 = "f0000000-0000-0000-0000-000000000001"
$RFQ_02 = "f0000000-0000-0000-0000-000000000002"
$RFQ_03 = "f0000000-0000-0000-0000-000000000003"
$RFQ_04 = "f0000000-0000-0000-0000-000000000004"
$RFQ_05 = "f0000000-0000-0000-0000-000000000005"
$RFQ_06 = "f0000000-0000-0000-0000-000000000006"
$RFQ_07 = "f0000000-0000-0000-0000-000000000007"

$allUserIds = @(
  $USER_ADMIN, $USER_MANAGER, $USER_CUST_OWNER, $USER_CUST_MEMBER,
  $USER_CUST_VIEWER, $USER_CUST_ARCH, $USER_CUST_OTHER, $USER_NONMEMBER,
  $USER_VEND_ACC, $USER_VEND_SUB, $USER_VEND_OTHER, $USER_VEND_VIEW, $USER_VEND_ARCH
)

# ---- Helpers ------------------------------------------------------------

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
  $hdrs = @{ "Content-Type" = "application/json" }
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
    Write-Host "  FAIL  $label  (expected $want, got $got)"
  }
}

function Psql-Scalar($sql) {
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  return (docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -t -c $sql 2>&1).Trim()
}

function Psql-File($sql) {
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($sql)
  $tmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllBytes($tmp, $bytes)
  docker cp $tmp supabase_db_encqbibzgoarvtcivgra:/tmp/mv_scratch.sql | Out-Null
  docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -f /tmp/mv_scratch.sql 2>&1
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

function Invoke-Cleanup {
  $cleanupSql = @(
    "DELETE FROM public.audit_events WHERE related_rfq_id IN ('$RFQ_01'::uuid, '$RFQ_02'::uuid, '$RFQ_03'::uuid, '$RFQ_04'::uuid, '$RFQ_05'::uuid, '$RFQ_06'::uuid, '$RFQ_07'::uuid);"
    "DELETE FROM public.rfq_operational_status WHERE rfq_id IN ('$RFQ_01'::uuid, '$RFQ_02'::uuid, '$RFQ_03'::uuid, '$RFQ_04'::uuid, '$RFQ_05'::uuid, '$RFQ_06'::uuid, '$RFQ_07'::uuid);"
    "DELETE FROM public.vendor_quote_responses WHERE rfq_id IN ('$RFQ_04'::uuid, '$RFQ_05'::uuid);"
    "DELETE FROM public.rental_requests WHERE id IN ('$RFQ_01'::uuid, '$RFQ_02'::uuid, '$RFQ_03'::uuid, '$RFQ_04'::uuid, '$RFQ_05'::uuid, '$RFQ_06'::uuid, '$RFQ_07'::uuid);"
    "DELETE FROM public.organization_memberships WHERE organization_id IN ('$ORG_CUST_A'::uuid, '$ORG_CUST_B'::uuid, '$ORG_VEND_X'::uuid, '$ORG_VEND_Y'::uuid, '$ORG_VEND_Z'::uuid);"
    "DELETE FROM public.organizations WHERE id IN ('$ORG_CUST_A'::uuid, '$ORG_CUST_B'::uuid, '$ORG_VEND_X'::uuid, '$ORG_VEND_Y'::uuid, '$ORG_VEND_Z'::uuid);"
    "DELETE FROM public.user_roles WHERE user_id IN ('$USER_ADMIN'::uuid, '$USER_MANAGER'::uuid);"
  ) -join "`n"
  Psql-File $cleanupSql
  foreach ($uid in $allUserIds) { Remove-AuthUser $uid }
}

function Reset-TestRFQs {
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  $sql = @'
UPDATE public.rental_requests SET operational_status = 'draft'
WHERE id IN (
  'f0000000-0000-0000-0000-000000000001'::uuid,
  'f0000000-0000-0000-0000-000000000002'::uuid,
  'f0000000-0000-0000-0000-000000000003'::uuid,
  'f0000000-0000-0000-0000-000000000006'::uuid,
  'f0000000-0000-0000-0000-000000000007'::uuid
);
UPDATE public.rental_requests SET operational_status = 'submitted'
WHERE id IN (
  'f0000000-0000-0000-0000-000000000004'::uuid,
  'f0000000-0000-0000-0000-000000000005'::uuid
);
'@
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($sql)
  $tmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllBytes($tmp, $bytes)
  docker cp $tmp supabase_db_encqbibzgoarvtcivgra:/tmp/mv_reset.sql | Out-Null
  docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -f /tmp/mv_reset.sql | Out-Null
  Write-Host "  RFQ states reset."
}

# ---- Pre-run cleanup -----------------------------------------------------
# Removes any leftover deterministic fixture data from a prior failed or
# interrupted run before seeding fresh data, matching the pattern used by
# b6_2_vendor_authority_verify.ps1 and b6_3_vqr_pending_review_verify.ps1.

Write-Host ""
Write-Host "Pre-run cleanup..."
Invoke-Cleanup
Write-Host "  Pre-run cleanup done."

# ---- Setup: auth users --------------------------------------------------

$allUsers = @(
  @{ id = $USER_ADMIN;       email = "m1-admin@test.local" },
  @{ id = $USER_MANAGER;     email = "m1-manager@test.local" },
  @{ id = $USER_CUST_OWNER;  email = "m1-cust-owner@test.local" },
  @{ id = $USER_CUST_MEMBER; email = "m1-cust-member@test.local" },
  @{ id = $USER_CUST_VIEWER; email = "m1-cust-viewer@test.local" },
  @{ id = $USER_CUST_ARCH;   email = "m1-cust-archived@test.local" },
  @{ id = $USER_CUST_OTHER;  email = "m1-cust-other@test.local" },
  @{ id = $USER_NONMEMBER;   email = "m1-nonmember@test.local" },
  @{ id = $USER_VEND_ACC;    email = "m1-vend-accepted@test.local" },
  @{ id = $USER_VEND_SUB;    email = "m1-vend-submitted@test.local" },
  @{ id = $USER_VEND_OTHER;  email = "m1-vend-other@test.local" },
  @{ id = $USER_VEND_VIEW;   email = "m1-vend-viewer@test.local" },
  @{ id = $USER_VEND_ARCH;   email = "m1-vend-archived@test.local" }
)

Write-Host ""
Write-Host "Creating auth users..."
foreach ($u in $allUsers) { New-AuthUser $u.id $u.email }
Write-Host "  Auth users created."

# ---- Setup: SQL ---------------------------------------------------------

Write-Host "Seeding orgs, memberships, roles, RFQs, quotes..."

Psql-File @'
-- Elevate admin and manager roles (trigger inserted 'customer' for both)
INSERT INTO public.user_roles (user_id, role) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'admin'),
  ('c0000000-0000-0000-0000-000000000002', 'manager')
ON CONFLICT DO NOTHING;

-- Organizations
INSERT INTO public.organizations (id, name, org_type, is_simulated) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'M1 Customer Org A', 'customer', false),
  ('d0000000-0000-0000-0000-000000000002', 'M1 Customer Org B', 'customer', false),
  ('d0000000-0000-0000-0000-000000000003', 'M1 Vendor Org X',   'vendor',   false),
  ('d0000000-0000-0000-0000-000000000004', 'M1 Vendor Org Y',   'vendor',   false),
  ('d0000000-0000-0000-0000-000000000005', 'M1 Vendor Org Z',   'vendor',   false)
ON CONFLICT (id) DO NOTHING;

-- Memberships
INSERT INTO public.organization_memberships (organization_id, user_id, role) VALUES
  -- Customer Org A
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'owner'),
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'member'),
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'viewer'),
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'member'),
  -- Customer Org B
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000007', 'member'),
  -- Vendor Org X
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000009', 'member'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000012', 'viewer'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000013', 'member'),
  -- Vendor Org Y
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000010', 'member'),
  -- Vendor Org Z
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000011', 'member')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Archive cust-archived (c006) and vend-archived (c013) memberships
UPDATE public.organization_memberships
  SET archived_at = now()
  WHERE user_id IN (
    'c0000000-0000-0000-0000-000000000006'::uuid,
    'c0000000-0000-0000-0000-000000000013'::uuid
  )
  AND archived_at IS NULL;

-- Test RFQs (all owned by cust-owner, org A)
INSERT INTO public.rental_requests
  (id, customer_id, customer_organization_id, operational_status)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'draft'),
  ('f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'draft'),
  ('f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'draft'),
  ('f0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'submitted'),
  ('f0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'submitted'),
  ('f0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'draft'),
  ('f0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'draft')
ON CONFLICT (id) DO NOTHING;

-- Vendor quotes
-- Org X accepted quote on f04 (enables T08 vend-accepted to succeed)
-- Org Y submitted-only quote on f05 (T09 blocked by quote status, not membership)
INSERT INTO public.vendor_quote_responses
  (rfq_id, vendor_organization_id, submitted_by, status)
VALUES
  ('f0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000009', 'accepted'),
  ('f0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000010', 'submitted')
ON CONFLICT DO NOTHING;
'@

Write-Host "  SQL seed complete."

# ---- Reset + sign in ----------------------------------------------------

Write-Host "Resetting test RFQ states..."
Reset-TestRFQs

Write-Host "Signing in test users..."
$jwt_admin        = Get-JWT "m1-admin@test.local"
$jwt_manager      = Get-JWT "m1-manager@test.local"
$jwt_cust_owner   = Get-JWT "m1-cust-owner@test.local"
$jwt_cust_member  = Get-JWT "m1-cust-member@test.local"
$jwt_cust_viewer  = Get-JWT "m1-cust-viewer@test.local"
$jwt_cust_arch    = Get-JWT "m1-cust-archived@test.local"
$jwt_cust_other   = Get-JWT "m1-cust-other@test.local"
$jwt_nonmember    = Get-JWT "m1-nonmember@test.local"
$jwt_vend_acc     = Get-JWT "m1-vend-accepted@test.local"
$jwt_vend_sub     = Get-JWT "m1-vend-submitted@test.local"
$jwt_vend_other   = Get-JWT "m1-vend-other@test.local"
$jwt_vend_view    = Get-JWT "m1-vend-viewer@test.local"
$jwt_vend_arch    = Get-JWT "m1-vend-archived@test.local"
Write-Host "  JWTs acquired."
Write-Host ""

# ========================================================================
# GROUP A: Customer authority
# ========================================================================

# T01: customer org owner (role=owner) can submit draft RFQ
Write-Host "T01: cust-owner (role=owner) f01 draft->submitted [req 1 owner]"
$r01 = Invoke-RF $jwt_cust_owner $RFQ_01 "submitted"
Check "T01 status=200" $r01.status 200
Check "T01 correlation_id returned" ($r01.body.correlation_id -ne $null) $true
if ($r01.status -eq 200 -and $r01.body.correlation_id) {
  $cid01 = $r01.body.correlation_id
  $ae01  = Psql-Scalar "SELECT COUNT(*) FROM public.audit_events WHERE correlation_id = '$cid01'::uuid"
  Check "T01 audit_events row exists" $ae01 "1"
  $src01 = Psql-Scalar "SELECT source FROM public.audit_events WHERE correlation_id = '$cid01'::uuid"
  Check "T01 source=customer_action" $src01 "customer_action"
} else {
  $script:FAIL += 2
  Write-Host "  FAIL  T01 DB checks skipped"
}

# T02: customer org member (role=member) can submit draft RFQ
Write-Host "T02: cust-member (role=member) f02 draft->submitted [req 1 member]"
$r02 = Invoke-RF $jwt_cust_member $RFQ_02 "submitted"
Check "T02 status=200" $r02.status 200
if ($r02.status -eq 200 -and $r02.body.correlation_id) {
  $src02 = Psql-Scalar "SELECT source FROM public.audit_events WHERE correlation_id = '$($r02.body.correlation_id)'::uuid"
  Check "T02 source=customer_action" $src02 "customer_action"
} else {
  $script:FAIL += 1
  Write-Host "  FAIL  T02 DB check skipped"
}

# T03: customer viewer (role=viewer) cannot perform customer transition
Write-Host "T03: cust-viewer (role=viewer) f03 draft->submitted blocked [req 2]"
$r03 = Invoke-RF $jwt_cust_viewer $RFQ_03 "submitted"
Check "T03 status=403" $r03.status 403

# T04: non-member cannot perform customer transition
Write-Host "T04: nonmember f03 draft->submitted blocked [req 3]"
$r04 = Invoke-RF $jwt_nonmember $RFQ_03 "submitted"
Check "T04 status=403" $r04.status 403

# T05: member of different customer org cannot access another org's RFQ
Write-Host "T05: cust-other (org B) f03 draft->submitted blocked [req 4]"
$r05 = Invoke-RF $jwt_cust_other $RFQ_03 "submitted"
Check "T05 status=403" $r05.status 403

# T06: archived customer membership cannot perform customer transition
Write-Host "T06: cust-archived (archived_at set) f03 draft->submitted blocked [req 5]"
$r06 = Invoke-RF $jwt_cust_arch $RFQ_03 "submitted"
Check "T06 status=403" $r06.status 403

# T07: vendor member cannot perform customer-owned transition
# T07 also verifies f03 is unchanged after T03-T07 all failed
Write-Host "T07: vend-accepted f03 draft->submitted blocked (vendor cannot do customer transition) [req 12]"
$r07 = Invoke-RF $jwt_vend_acc $RFQ_03 "submitted"
Check "T07 status=403" $r07.status 403
$f03_status = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = 'f0000000-0000-0000-0000-000000000003'::uuid"
Check "T07 f03 status unchanged = draft after all rejections" $f03_status "draft"
$f03_os_count = Psql-Scalar "SELECT COUNT(*) FROM public.rfq_operational_status WHERE rfq_id = 'f0000000-0000-0000-0000-000000000003'::uuid"
Check "T07 no rfq_operational_status rows written for f03" $f03_os_count "0"

# ========================================================================
# GROUP B: Vendor authority
# ========================================================================

# T08: vendor org member with accepted quote can perform vendor transition
Write-Host "T08: vend-accepted f04 submitted->pending_vendor_review [req 6]"
$r08 = Invoke-RF $jwt_vend_acc $RFQ_04 "pending_vendor_review"
Check "T08 status=200" $r08.status 200
Check "T08 correlation_id returned" ($r08.body.correlation_id -ne $null) $true
if ($r08.status -eq 200 -and $r08.body.correlation_id) {
  $cid08 = $r08.body.correlation_id
  $ae08  = Psql-Scalar "SELECT COUNT(*) FROM public.audit_events WHERE correlation_id = '$cid08'::uuid"
  Check "T08 audit_events row exists" $ae08 "1"
  $src08 = Psql-Scalar "SELECT source FROM public.audit_events WHERE correlation_id = '$cid08'::uuid"
  Check "T08 source=vendor_action" $src08 "vendor_action"
} else {
  $script:FAIL += 2
  Write-Host "  FAIL  T08 DB checks skipped"
}

# T09: vendor with submitted-only quote (not accepted) is blocked
Write-Host "T09: vend-submitted (submitted-only quote) f05 submitted->pending_vendor_review blocked [req 7]"
$r09 = Invoke-RF $jwt_vend_sub $RFQ_05 "pending_vendor_review"
Check "T09 status=403" $r09.status 403

# T10: vendor from a different org with no accepted quote is blocked
Write-Host "T10: vend-other (org Z, no quote) f05 submitted->pending_vendor_review blocked [req 8]"
$r10 = Invoke-RF $jwt_vend_other $RFQ_05 "pending_vendor_review"
Check "T10 status=403" $r10.status 403

# T11: archived vendor membership is blocked even if org has a quote elsewhere
Write-Host "T11: vend-archived (archived membership) f05 submitted->pending_vendor_review blocked [req 9]"
$r11 = Invoke-RF $jwt_vend_arch $RFQ_05 "pending_vendor_review"
Check "T11 status=403" $r11.status 403

# T12: vendor viewer role (not in owner/admin/member) is blocked
Write-Host "T12: vend-viewer (role=viewer in org X) f05 submitted->pending_vendor_review blocked [req 10]"
$r12 = Invoke-RF $jwt_vend_view $RFQ_05 "pending_vendor_review"
Check "T12 status=403" $r12.status 403

# T13: customer member cannot perform vendor-owned transition
# T13 also verifies f05 is unchanged after T09-T13 all failed
Write-Host "T13: cust-member f05 submitted->pending_vendor_review blocked (customer cannot do vendor transition) [req 11]"
$r13 = Invoke-RF $jwt_cust_member $RFQ_05 "pending_vendor_review"
Check "T13 status=403" $r13.status 403
$f05_status = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = 'f0000000-0000-0000-0000-000000000005'::uuid"
Check "T13 f05 status unchanged = submitted after all rejections" $f05_status "submitted"
$f05_os_count = Psql-Scalar "SELECT COUNT(*) FROM public.rfq_operational_status WHERE rfq_id = 'f0000000-0000-0000-0000-000000000005'::uuid"
Check "T13 no rfq_operational_status rows written for f05" $f05_os_count "0"

# ========================================================================
# GROUP C: Admin / manager authority
# ========================================================================

# T14: platform admin (user_roles.role = admin) can perform any valid transition
Write-Host "T14: admin f06 draft->submitted [req 13 admin, req 15 source]"
$r14 = Invoke-RF $jwt_admin $RFQ_06 "submitted"
Check "T14 status=200" $r14.status 200
Check "T14 correlation_id returned" ($r14.body.correlation_id -ne $null) $true
if ($r14.status -eq 200 -and $r14.body.correlation_id) {
  $cid14 = $r14.body.correlation_id
  $ae14  = Psql-Scalar "SELECT COUNT(*) FROM public.audit_events WHERE correlation_id = '$cid14'::uuid"
  Check "T14 audit_events row exists" $ae14 "1"
  $src14 = Psql-Scalar "SELECT source FROM public.audit_events WHERE correlation_id = '$cid14'::uuid"
  Check "T14 source=admin_action" $src14 "admin_action"
} else {
  $script:FAIL += 2
  Write-Host "  FAIL  T14 DB checks skipped"
}

# T15: platform manager (user_roles.role = manager) also gets admin_action source
Write-Host "T15: manager f07 draft->submitted [req 13 manager, req 15 source]"
$r15 = Invoke-RF $jwt_manager $RFQ_07 "submitted"
Check "T15 status=200" $r15.status 200
if ($r15.status -eq 200 -and $r15.body.correlation_id) {
  $src15 = Psql-Scalar "SELECT source FROM public.audit_events WHERE correlation_id = '$($r15.body.correlation_id)'::uuid"
  Check "T15 source=admin_action" $src15 "admin_action"
} else {
  $script:FAIL += 1
  Write-Host "  FAIL  T15 DB check skipped"
}

# ========================================================================
# GROUP D: Membership write protection (req 20)
# ========================================================================

Write-Host "T16: authenticated POST to organization_memberships blocked [req 20]"
$fakeMembership = @{
  organization_id = $ORG_CUST_A
  user_id         = $USER_NONMEMBER
  role            = "member"
}
$r16 = Invoke-REST "Post" "organization_memberships" $jwt_cust_member $fakeMembership $null
Check "T16 auth INSERT org_memberships blocked (not 200/201)" ($r16.status -ne 200 -and $r16.status -ne 201) $true

Write-Host "T17: authenticated PATCH to organization_memberships blocked [req 20]"
$patchBody = @{ role = "owner" }
Invoke-REST "Patch" "organization_memberships" $jwt_cust_member $patchBody "?user_id=eq.$USER_CUST_MEMBER" | Out-Null
$r17_role = Psql-Scalar "SELECT role FROM public.organization_memberships WHERE user_id = 'c0000000-0000-0000-0000-000000000004'::uuid AND organization_id = 'd0000000-0000-0000-0000-000000000001'::uuid"
Check "T17 PATCH did not mutate row (role still member)" $r17_role "member"

Write-Host "T18: authenticated DELETE from organization_memberships blocked [req 20]"
Invoke-REST "Delete" "organization_memberships" $jwt_cust_member $null "?user_id=eq.$USER_CUST_MEMBER" | Out-Null
$r18_count = Psql-Scalar "SELECT COUNT(*) FROM public.organization_memberships WHERE user_id = 'c0000000-0000-0000-0000-000000000004'::uuid AND organization_id = 'd0000000-0000-0000-0000-000000000001'::uuid"
Check "T18 DELETE did not remove row (membership still exists)" $r18_count "1"

Write-Host "T19: anon POST to organization_memberships blocked [req 20]"
$r19 = Invoke-REST "Post" "organization_memberships" $null $fakeMembership $null
Check "T19 anon INSERT org_memberships blocked (not 200/201)" ($r19.status -ne 200 -and $r19.status -ne 201) $true

# ========================================================================
# Cleanup
# ========================================================================

Write-Host ""
Write-Host "Post-run cleanup..."
Invoke-Cleanup
Write-Host "  Cleanup done."

# ========================================================================
# Summary
# ========================================================================

$total = $script:PASS + $script:FAIL
Write-Host ""
Write-Host "----------------------------------------"
Write-Host "RESULT: $($script:PASS) / $total passed"
if ($script:FAIL -gt 0) {
  Write-Host "FAILURES: $($script:FAIL)"
}
Write-Host "----------------------------------------"
