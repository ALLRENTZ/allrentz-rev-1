# P1-2 RFQ Transition Validation
# Scope: 21-transition lifecycle, invalid transitions, terminal states, DB bypass,
#        source attribution, audit integrity, correlation integrity, rollback
# Run from repo root: powershell -File supabase/rfq_transition_verify.ps1
# Requires: P1 migrations applied, supabase functions serve running

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

$script:PASS = 0
$script:FAIL = 0

# ---- UUIDs (hex only: a-f, 0-9) -------------------------------------------
# a1-prefix: test users  b1-prefix: test org  d1-prefix: test RFQs
# Chosen to avoid conflict with membership test UUIDs (c0/d0/f0 prefixes)

$USER_ADMIN      = "a1000000-0000-0000-0000-000000000001"
$USER_CUST_OWNER = "a1000000-0000-0000-0000-000000000002"
$USER_VENDOR     = "a1000000-0000-0000-0000-000000000003"
$ORG_CUST        = "b1000000-0000-0000-0000-000000000001"
$ORG_VENDOR      = "b1000000-0000-0000-0000-000000000002"

# B5-1 requires a valid, non-finalized vendor_quote_responses row (vqr_id) for
# any quote_accepted transition. One VQR fixture per RFQ that passes through
# quote_accepted: D01 (main path), D06/D07/D08 (cancellation prereqs), D10
# (rejection prereq). e1-prefix: VQR fixtures, suffix matches the RFQ suffix.
$VQR_D01 = "e1000000-0000-0000-0000-000000000001"
$VQR_D06 = "e1000000-0000-0000-0000-000000000006"
$VQR_D07 = "e1000000-0000-0000-0000-000000000007"
$VQR_D08 = "e1000000-0000-0000-0000-000000000008"
$VQR_D10 = "e1000000-0000-0000-0000-000000000010"

# D01: full main path (12 steps, ends at completed)
# D02: draft->cancelled (customer)
# D03-D08: cancellations from submitted..mobilizing (admin fast-track)
# D09: vendor_quote_received->rejected
# D10: quote_accepted->rejected
# D11: invalid transition target (stays draft)
# D12: same-status target (stays draft)
# D13: customer source attribution

$RFQ_D01 = "d1000000-0000-0000-0000-000000000001"
$RFQ_D02 = "d1000000-0000-0000-0000-000000000002"
$RFQ_D03 = "d1000000-0000-0000-0000-000000000003"
$RFQ_D04 = "d1000000-0000-0000-0000-000000000004"
$RFQ_D05 = "d1000000-0000-0000-0000-000000000005"
$RFQ_D06 = "d1000000-0000-0000-0000-000000000006"
$RFQ_D07 = "d1000000-0000-0000-0000-000000000007"
$RFQ_D08 = "d1000000-0000-0000-0000-000000000008"
$RFQ_D09 = "d1000000-0000-0000-0000-000000000009"
$RFQ_D10 = "d1000000-0000-0000-0000-000000000010"
$RFQ_D11 = "d1000000-0000-0000-0000-000000000011"
$RFQ_D12 = "d1000000-0000-0000-0000-000000000012"
$RFQ_D13 = "d1000000-0000-0000-0000-000000000013"

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

function Invoke-RF($jwt, $rfq_id, $new_status, $vqr_id = $null) {
  $hdrs = @{ "Content-Type" = "application/json" }
  if ($jwt) { $hdrs["Authorization"] = "Bearer $jwt" }
  $bodyObj = @{ rfq_id = $rfq_id; new_status = $new_status }
  if ($vqr_id) { $bodyObj["vqr_id"] = $vqr_id }
  $body = $bodyObj | ConvertTo-Json
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
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  $out = docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -t -c $sql 2>&1
  return (($out | ForEach-Object { $_.ToString() }) -join "").Trim()
}

function Psql-File($sql) {
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($sql)
  $tmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllBytes($tmp, $bytes)
  docker cp $tmp supabase_db_encqbibzgoarvtcivgra:/tmp/rt_scratch.sql | Out-Null
  docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -f /tmp/rt_scratch.sql 2>&1
}

function Psql-FileScalar($sql) {
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($sql)
  $tmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllBytes($tmp, $bytes)
  docker cp $tmp supabase_db_encqbibzgoarvtcivgra:/tmp/rt_scalar.sql | Out-Null
  $out = docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -t -f /tmp/rt_scalar.sql 2>&1
  return (($out | ForEach-Object { $_.ToString() }) -join "").Trim()
}

function Psql-Error($sql) {
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  $out = docker exec supabase_db_encqbibzgoarvtcivgra psql -U postgres -c $sql 2>&1
  return (($out | ForEach-Object { $_.ToString() }) -join " ").Trim()
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

function Advance-RFQ($jwt, $rfq_id, [string[]]$steps, $vqrId = $null) {
  foreach ($s in $steps) {
    if ($s -eq 'quote_accepted') {
      $r = Invoke-RF $jwt $rfq_id $s $vqrId
    } else {
      $r = Invoke-RF $jwt $rfq_id $s
    }
    if ($r.status -ne 200) {
      Write-Host "  WARN  Advance-RFQ $rfq_id -> $s failed (status=$($r.status))"
      return $false
    }
  }
  return $true
}

# ---- Setup: auth users ------------------------------------------------------

Write-Host ""
Write-Host "Creating auth users..."
New-AuthUser $USER_ADMIN      "rt-admin@test.local"
New-AuthUser $USER_CUST_OWNER "rt-cust-owner@test.local"
New-AuthUser $USER_VENDOR     "rt-vendor@test.local"
Write-Host "  Auth users created."

# ---- Setup: SQL seed --------------------------------------------------------

Write-Host "Seeding test data..."

Psql-File @'
INSERT INTO public.user_roles (user_id, role)
  VALUES ('a1000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.organizations (id, name, org_type, is_simulated)
  VALUES ('b1000000-0000-0000-0000-000000000001', 'RT Customer Org', 'customer', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_memberships (organization_id, user_id, role)
  VALUES ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'owner')
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.organizations (id, name, org_type, is_simulated)
  VALUES ('b1000000-0000-0000-0000-000000000002', 'RT Vendor Org', 'vendor', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_memberships (organization_id, user_id, role)
  VALUES ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'owner')
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.rental_requests (id, customer_id, customer_organization_id, operational_status)
VALUES
  ('d1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000006','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000008','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000009','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000010','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000011','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000012','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft'),
  ('d1000000-0000-0000-0000-000000000013','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','draft')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vendor_quote_responses (id, rfq_id, vendor_organization_id, submitted_by, status, version, is_simulated)
VALUES
  ('e1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003','submitted',1,false),
  ('e1000000-0000-0000-0000-000000000006','d1000000-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003','submitted',1,false),
  ('e1000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000007','b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003','submitted',1,false),
  ('e1000000-0000-0000-0000-000000000008','d1000000-0000-0000-0000-000000000008','b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003','submitted',1,false),
  ('e1000000-0000-0000-0000-000000000010','d1000000-0000-0000-0000-000000000010','b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003','submitted',1,false)
ON CONFLICT (id) DO NOTHING;
'@

Write-Host "  SQL seed complete."

# ---- Sign in ----------------------------------------------------------------

Write-Host "Signing in..."
$jwt_admin      = Get-JWT "rt-admin@test.local"
$jwt_cust_owner = Get-JWT "rt-cust-owner@test.local"
Write-Host "  JWTs acquired."
Write-Host ""

# ============================================================================
# GROUP A: Full main path (D01, 12 steps via admin)
# ============================================================================

Write-Host "GROUP A: Full main path (D01 draft -> ... -> completed)"

$mainPath = @(
  'submitted','pending_vendor_review','vendor_quote_received','quote_accepted',
  'vendor_confirmed','mobilizing','in_transit','on_rent',
  'off_rent_requested','demobilizing','off_rent','completed'
)
$prevStatus  = 'draft'
$stepNum     = 0
$firstCorrId = $null

foreach ($nextStatus in $mainPath) {
  $stepNum++
  $label = "A{0:D2} $prevStatus->$nextStatus" -f $stepNum
  Write-Host "  $label"
  $vqrForStep = if ($nextStatus -eq 'quote_accepted') { $VQR_D01 } else { $null }
  $r = Invoke-RF $jwt_admin $RFQ_D01 $nextStatus $vqrForStep
  Check "$label status=200"            $r.status 200
  $cidOk = ($null -ne $r.body -and $null -ne $r.body.correlation_id)
  Check "$label correlation_id"        $cidOk $true
  if ($stepNum -eq 1 -and $cidOk) { $firstCorrId = $r.body.correlation_id }
  $dbSt = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$RFQ_D01'::uuid"
  Check "$label db_status=$nextStatus" $dbSt $nextStatus
  $prevStatus = $nextStatus
}

$auditCnt  = Psql-Scalar "SELECT COUNT(*) FROM public.audit_events WHERE related_rfq_id = '$RFQ_D01'::uuid"
$statusCnt = Psql-Scalar "SELECT COUNT(*) FROM public.rfq_operational_status WHERE rfq_id = '$RFQ_D01'::uuid"
Check "A-audit  audit_events count=12"           $auditCnt  "12"
Check "A-status rfq_op_status count=12"          $statusCnt "12"

if ($firstCorrId) {
  $src   = Psql-Scalar "SELECT source   FROM public.audit_events WHERE correlation_id = '$firstCorrId'::uuid"
  $actor = Psql-Scalar "SELECT actor_id FROM public.audit_events WHERE correlation_id = '$firstCorrId'::uuid"
  Check "A-src   step-1 source=admin_action"     $src   "admin_action"
  Check "A-actor step-1 actor_id=USER_ADMIN"     $actor $USER_ADMIN
} else {
  $script:FAIL += 2
  Write-Host "  FAIL  A-src/A-actor skipped (no correlation_id from step 1)"
}

Write-Host ""

# ============================================================================
# GROUP B: Cancellation from every cancellable state (7 transitions via admin)
# ============================================================================

Write-Host "GROUP B: Cancellations from every cancellable state"

$cancelCases = @(
  @{ id = $RFQ_D02; label = "B01 draft->cancelled";                 prereq = @() },
  @{ id = $RFQ_D03; label = "B02 submitted->cancelled";             prereq = @("submitted") },
  @{ id = $RFQ_D04; label = "B03 pvr->cancelled";                   prereq = @("submitted","pending_vendor_review") },
  @{ id = $RFQ_D05; label = "B04 vqr->cancelled";                   prereq = @("submitted","pending_vendor_review","vendor_quote_received") },
  @{ id = $RFQ_D06; label = "B05 quote_accepted->cancelled";        prereq = @("submitted","pending_vendor_review","vendor_quote_received","quote_accepted"); vqr = $VQR_D06 },
  @{ id = $RFQ_D07; label = "B06 vendor_confirmed->cancelled";      prereq = @("submitted","pending_vendor_review","vendor_quote_received","quote_accepted","vendor_confirmed"); vqr = $VQR_D07 },
  @{ id = $RFQ_D08; label = "B07 mobilizing->cancelled";            prereq = @("submitted","pending_vendor_review","vendor_quote_received","quote_accepted","vendor_confirmed","mobilizing"); vqr = $VQR_D08 }
)

foreach ($c in $cancelCases) {
  if ($c.prereq.Count -gt 0) { Advance-RFQ $jwt_admin $c.id $c.prereq $c.vqr | Out-Null }
  $r = Invoke-RF $jwt_admin $c.id "cancelled"
  Check "$($c.label) status=200"          $r.status 200
  Check "$($c.label) correlation_id"      ($null -ne $r.body -and $null -ne $r.body.correlation_id) $true
  $dbSt = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$($c.id)'::uuid"
  Check "$($c.label) db_status=cancelled" $dbSt "cancelled"
}

Write-Host ""

# ============================================================================
# GROUP C: Rejection paths (2 transitions via admin)
# ============================================================================

Write-Host "GROUP C: Rejection transitions"

Advance-RFQ $jwt_admin $RFQ_D09 @("submitted","pending_vendor_review","vendor_quote_received") | Out-Null
$r09 = Invoke-RF $jwt_admin $RFQ_D09 "rejected"
Check "C01 vqr->rejected status=200"   $r09.status 200
Check "C01 correlation_id"             ($null -ne $r09.body -and $null -ne $r09.body.correlation_id) $true
$s09 = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$RFQ_D09'::uuid"
Check "C01 db_status=rejected"         $s09 "rejected"

Advance-RFQ $jwt_admin $RFQ_D10 @("submitted","pending_vendor_review","vendor_quote_received","quote_accepted") $VQR_D10 | Out-Null
$r10 = Invoke-RF $jwt_admin $RFQ_D10 "rejected"
Check "C02 quote_accepted->rejected status=200" $r10.status 200
Check "C02 correlation_id"                      ($null -ne $r10.body -and $null -ne $r10.body.correlation_id) $true
$s10 = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$RFQ_D10'::uuid"
Check "C02 db_status=rejected"                  $s10 "rejected"

Write-Host ""

# ============================================================================
# GROUP D: Invalid transitions via EF (D11 stays draft throughout)
# ============================================================================

Write-Host "GROUP D: Invalid transitions rejected by EF (D11)"

$invalidCases = @(
  @{ to = "pending_vendor_review"; label = "D01 draft->pvr (skip step)" },
  @{ to = "completed";             label = "D02 draft->completed (skip to end)" },
  @{ to = "rejected";              label = "D03 draft->rejected (not in allowlist from draft)" },
  @{ to = "vendor_quote_received"; label = "D04 draft->vqr (multi-skip)" }
)
foreach ($d in $invalidCases) {
  $r = Invoke-RF $jwt_admin $RFQ_D11 $d.to
  Check "$($d.label) status=422" $r.status 422
}

Write-Host ""

# ============================================================================
# GROUP E: Same-status transition via EF (D12 stays draft)
# ============================================================================

Write-Host "GROUP E: Same-status transition rejected"

$re = Invoke-RF $jwt_admin $RFQ_D12 "draft"
Check "E01 draft->draft status=422" $re.status 422

Write-Host ""

# ============================================================================
# GROUP F: Terminal-state enforcement
# D01=completed, D02=cancelled, D09=rejected
# ============================================================================

Write-Host "GROUP F: Terminal state enforcement"

$termCases = @(
  @{ id = $RFQ_D01; label = "F01 completed->submitted blocked" },
  @{ id = $RFQ_D02; label = "F02 cancelled->submitted blocked"  },
  @{ id = $RFQ_D09; label = "F03 rejected->submitted blocked"   }
)
foreach ($f in $termCases) {
  $r = Invoke-RF $jwt_admin $f.id "submitted"
  Check "$($f.label) status=422" $r.status 422
}

Write-Host ""

# ============================================================================
# GROUP G: Invalid status value (EF input validation, status=400)
# ============================================================================

Write-Host "GROUP G: Invalid status value (EF input validation)"

$rg1 = Invoke-RF $jwt_admin $RFQ_D11 "banana"
Check "G01 new_status=banana status=400"          $rg1.status 400
$rg2 = Invoke-RF $jwt_admin $RFQ_D11 ""
Check "G02 new_status=empty status=400"           $rg2.status 400
$rg3 = Invoke-RF $jwt_admin $RFQ_D11 "rental_extended"
Check "G03 new_status=rental_extended status=400" $rg3.status 400

Write-Host ""

# ============================================================================
# GROUP H: Failed transition integrity — no mutation on any failure
# D11: 4+2+3=9 failed attempts. D12: 1 failed attempt.
# ============================================================================

Write-Host "GROUP H: Failed transition integrity"

$h11St = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$RFQ_D11'::uuid"
Check "H01 D11 status unchanged=draft" $h11St "draft"
$h11Ae = Psql-Scalar "SELECT COUNT(*) FROM public.audit_events WHERE related_rfq_id = '$RFQ_D11'::uuid"
Check "H02 D11 audit_events count=0"   $h11Ae "0"
$h11Os = Psql-Scalar "SELECT COUNT(*) FROM public.rfq_operational_status WHERE rfq_id = '$RFQ_D11'::uuid"
Check "H03 D11 rfq_op_status count=0"  $h11Os "0"

$h12St = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$RFQ_D12'::uuid"
Check "H04 D12 status unchanged=draft" $h12St "draft"
$h12Ae = Psql-Scalar "SELECT COUNT(*) FROM public.audit_events WHERE related_rfq_id = '$RFQ_D12'::uuid"
Check "H05 D12 audit_events count=0"   $h12Ae "0"

Write-Host ""

# ============================================================================
# GROUP I: DB allowlist bypass — transition_rfq_status() called directly via psql
# ============================================================================

Write-Host "GROUP I: DB bypass (psql direct calls)"

$sql_i01 = "SELECT public.transition_rfq_status('$RFQ_D11'::uuid,'pending_vendor_review'::public.app_rfq_status,'$USER_ADMIN'::uuid,NULL,NULL,'admin_action',false)"
$out_i01 = Psql-Error $sql_i01
Check "I01 DB rejects draft->pvr (invalid, no EF)" ($out_i01 -match "not an allowed status transition") $true

$sql_i02 = "SELECT public.transition_rfq_status('$RFQ_D12'::uuid,'draft'::public.app_rfq_status,'$USER_ADMIN'::uuid,NULL,NULL,'admin_action',false)"
$out_i02 = Psql-Error $sql_i02
Check "I02 DB rejects draft->draft (same-status, no EF)" ($out_i02 -match "already in status") $true

$sql_i03 = "SELECT public.transition_rfq_status('$RFQ_D01'::uuid,'submitted'::public.app_rfq_status,'$USER_ADMIN'::uuid,NULL,NULL,'admin_action',false)"
$out_i03 = Psql-Error $sql_i03
Check "I03 DB rejects completed->submitted (terminal, no EF)" ($out_i03 -match "terminal status") $true

$sql_i04 = "SELECT public.transition_rfq_status('$RFQ_D11'::uuid,'rental_extended'::public.app_rfq_status,'$USER_ADMIN'::uuid,NULL,NULL,'admin_action',false)"
$out_i04 = Psql-Error $sql_i04
Check "I04 DB rejects draft->rental_extended (orphaned enum, no EF)" ($out_i04 -match "not an allowed status transition") $true

Write-Host ""

# ============================================================================
# GROUP J: Customer source attribution (D13)
# ============================================================================

Write-Host "GROUP J: Customer source attribution (D13)"

$rj = Invoke-RF $jwt_cust_owner $RFQ_D13 "submitted"
Check "J01 cust-owner draft->submitted status=200"  $rj.status 200
$cidJOk = ($null -ne $rj.body -and $null -ne $rj.body.correlation_id)
Check "J02 correlation_id returned"                  $cidJOk $true
if ($cidJOk) {
  $cid_j   = $rj.body.correlation_id
  $src_j   = Psql-Scalar "SELECT source   FROM public.audit_events WHERE correlation_id = '$cid_j'::uuid"
  $actor_j = Psql-Scalar "SELECT actor_id FROM public.audit_events WHERE correlation_id = '$cid_j'::uuid"
  Check "J03 source=customer_action"    $src_j   "customer_action"
  Check "J04 actor_id=USER_CUST_OWNER"  $actor_j $USER_CUST_OWNER
} else {
  $script:FAIL += 2
  Write-Host "  FAIL  J03/J04 skipped (no correlation_id)"
}
$dbSt_j = Psql-Scalar "SELECT operational_status FROM public.rental_requests WHERE id = '$RFQ_D13'::uuid"
Check "J05 D13 db_status=submitted"     $dbSt_j "submitted"

Write-Host ""

# ============================================================================
# GROUP K: Correlation ID uniqueness across D01's 12 transitions
# ============================================================================

Write-Host "GROUP K: Correlation ID uniqueness (D01)"

$uniq = Psql-Scalar "SELECT (COUNT(*) = COUNT(DISTINCT correlation_id))::text FROM public.rfq_operational_status WHERE rfq_id = '$RFQ_D01'::uuid"
Check "K01 all 12 correlation_ids are unique" $uniq "true"

Write-Host ""

# ============================================================================
# GROUP L: Lifecycle history order (D01)
# ============================================================================

Write-Host "GROUP L: Lifecycle history order (D01)"

$seqSql = @"
WITH ordered AS (
  SELECT new_status::text, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM public.rfq_operational_status
  WHERE rfq_id = 'd1000000-0000-0000-0000-000000000001'::uuid
)
SELECT COUNT(*) FROM ordered WHERE
  (rn = 1  AND new_status = 'submitted') OR
  (rn = 2  AND new_status = 'pending_vendor_review') OR
  (rn = 3  AND new_status = 'vendor_quote_received') OR
  (rn = 4  AND new_status = 'quote_accepted') OR
  (rn = 5  AND new_status = 'vendor_confirmed') OR
  (rn = 6  AND new_status = 'mobilizing') OR
  (rn = 7  AND new_status = 'in_transit') OR
  (rn = 8  AND new_status = 'on_rent') OR
  (rn = 9  AND new_status = 'off_rent_requested') OR
  (rn = 10 AND new_status = 'demobilizing') OR
  (rn = 11 AND new_status = 'off_rent') OR
  (rn = 12 AND new_status = 'completed')
"@
$seqResult = Psql-FileScalar $seqSql
Check "L01 all 12 steps in correct sequence" $seqResult "12"

$monoSql = @"
SELECT COUNT(*) FROM (
  SELECT created_at, LAG(created_at) OVER (ORDER BY created_at, id) AS prev_at
  FROM public.rfq_operational_status
  WHERE rfq_id = 'd1000000-0000-0000-0000-000000000001'::uuid
) t WHERE prev_at IS NOT NULL AND created_at < prev_at
"@
$monoResult = Psql-FileScalar $monoSql
Check "L02 lifecycle timestamps monotonically non-decreasing" $monoResult "0"

Write-Host ""

# ============================================================================
# Cleanup
# ============================================================================

Write-Host "Cleaning up..."

Psql-File @'
DELETE FROM public.vendor_quote_responses WHERE id IN (
  'e1000000-0000-0000-0000-000000000001'::uuid,
  'e1000000-0000-0000-0000-000000000006'::uuid,
  'e1000000-0000-0000-0000-000000000007'::uuid,
  'e1000000-0000-0000-0000-000000000008'::uuid,
  'e1000000-0000-0000-0000-000000000010'::uuid
);
DELETE FROM public.audit_events WHERE related_rfq_id IN (
  'd1000000-0000-0000-0000-000000000001'::uuid,
  'd1000000-0000-0000-0000-000000000002'::uuid,
  'd1000000-0000-0000-0000-000000000003'::uuid,
  'd1000000-0000-0000-0000-000000000004'::uuid,
  'd1000000-0000-0000-0000-000000000005'::uuid,
  'd1000000-0000-0000-0000-000000000006'::uuid,
  'd1000000-0000-0000-0000-000000000007'::uuid,
  'd1000000-0000-0000-0000-000000000008'::uuid,
  'd1000000-0000-0000-0000-000000000009'::uuid,
  'd1000000-0000-0000-0000-000000000010'::uuid,
  'd1000000-0000-0000-0000-000000000011'::uuid,
  'd1000000-0000-0000-0000-000000000012'::uuid,
  'd1000000-0000-0000-0000-000000000013'::uuid
);
DELETE FROM public.rental_requests WHERE id IN (
  'd1000000-0000-0000-0000-000000000001'::uuid,
  'd1000000-0000-0000-0000-000000000002'::uuid,
  'd1000000-0000-0000-0000-000000000003'::uuid,
  'd1000000-0000-0000-0000-000000000004'::uuid,
  'd1000000-0000-0000-0000-000000000005'::uuid,
  'd1000000-0000-0000-0000-000000000006'::uuid,
  'd1000000-0000-0000-0000-000000000007'::uuid,
  'd1000000-0000-0000-0000-000000000008'::uuid,
  'd1000000-0000-0000-0000-000000000009'::uuid,
  'd1000000-0000-0000-0000-000000000010'::uuid,
  'd1000000-0000-0000-0000-000000000011'::uuid,
  'd1000000-0000-0000-0000-000000000012'::uuid,
  'd1000000-0000-0000-0000-000000000013'::uuid
);
DELETE FROM public.organization_memberships WHERE organization_id = 'b1000000-0000-0000-0000-000000000002'::uuid;
DELETE FROM public.organizations WHERE id = 'b1000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.organizations WHERE id = 'b1000000-0000-0000-0000-000000000002'::uuid;
'@

Remove-AuthUser $USER_ADMIN
Remove-AuthUser $USER_CUST_OWNER
Remove-AuthUser $USER_VENDOR
Write-Host "  Cleanup done."

# ============================================================================
# Summary
# ============================================================================

$total = $script:PASS + $script:FAIL
Write-Host ""
Write-Host "----------------------------------------"
Write-Host "RESULT: $($script:PASS) / $total passed"
if ($script:FAIL -gt 0) { Write-Host "FAILURES: $($script:FAIL)" }
Write-Host "----------------------------------------"
