---
title: Pickup, Custody, and Invoice Control Requirements
domain: product
lifecycle_status: active
governance_state: candidate
authorized_scope: target product requirements and implementation sequencing only; no schema, command, rule, billing, deployment, or production authority
authorization_reference: Patrick McGriff, separate benchmark and product-requirements wave, 2026-08-13
authority: subordinate to /ALLRENTZ_CONSTITUTION.md, docs/doctrine/ALLRENTZ_ARCHITECTURAL_FOUNDATION.md, and verified repository behavior
related: docs/product/rental-lifecycle-framework.md, docs/strategy/off-rent-governance-benchmark.md, docs/engineering/stop-rent-authority-implementation-contract.md
verification_baseline: repository commit f8c44f765287aeeb75ec95d4199a09f3387179fc; PR #10 merged and exact Cloudflare Pages production deployment verified 2026-08-13
last_reviewed: 2026-08-13
---

# Pickup, Custody, and Invoice Control Requirements

## Decision and authority boundary

**APPROVED DOCTRINE** — The next operational product slice after the merged and production-verified PR #10 is a customer-visible, vendor-operated `PickupTask`. It coordinates scheduling, field progress, attempts, collection, handoff, and return-location receipt. It is explicitly separate from rental-stop and billing authority.

This document authorizes product requirements and target architecture only. It does not authorize code, schema, migrations, RLS, commands, rule publication, evaluator activation, billing calculation, deployment, or production access. Until the implementation prerequisites and a separate exact-scope authorization are satisfied, the slice is **BLOCKED**.

The following cannot determine `stop_effective_at`, `billable_through_at`, lifecycle `off_rent`, invoice liability, or a contractual result:

- `PickupTask` state;
- a customer request or desired pickup time;
- vendor acknowledgment or schedule;
- driver location, arrival, attempt, collection, or delivery;
- a signature, photograph, scan, telematics reading, or custody assertion;
- AI extraction, matching, damage detection, or recommendation;
- frontend state; or
- elapsed time or an SLA breach.

Only the existing guarded determination path described in `docs/engineering/stop-rent-authority-implementation-contract.md` may own the implemented financial stop transition. No universal `demobilizing → off_rent` rule is authorized or seeded.

## Implemented versus target architecture

| Capability | Current verified repository behavior | Target requirement | Classification |
| --- | --- | --- | --- |
| Customer off-rent request | The controlled `rfq-off-rent` command records an authenticated, authorized request with requested stop and pickup-availability timestamps. | Continue to use this governed request as an input; do not duplicate it inside `PickupTask`. | **VERIFIED IMPLEMENTATION** at the stated baseline; production publication is not asserted here. |
| Vendor acknowledgment | The accepted vendor can acknowledge the request and provide a pickup window through the controlled command. | A confirmed vendor window may create or update the operational schedule through a separate controlled logistics command. | **VERIFIED IMPLEMENTATION** for acknowledgment; `PickupTask` integration is **PRODUCT HYPOTHESIS**. |
| Shared status and audit view | Customer and vendor dashboards display a sanitized read-only projection of request, acknowledgment, determination status and selected events. Malformed or missing authority fails to `UNKNOWN/BLOCKED`. | Add pickup progress and evidence summaries without exposing privileged records or making the projection authoritative. | **VERIFIED IMPLEMENTATION** at the stated baseline; expansion is **PRODUCT HYPOTHESIS**. |
| Financial stop determination | A guarded database-owned command may determine and atomically transition only when all required authority agrees. No applicable universal rule is seeded. | Keep the determination independent and immutable; `PickupTask` may be referenced as evidence only when an applicable published rule explicitly requires it. | **VERIFIED IMPLEMENTATION** and **APPROVED DOCTRINE**. |
| Pickup coordination | Request and acknowledgment carry availability windows, but there is no canonical task, assignment, field-progress or attempt object in the verified package. | Add one governed `PickupTask` command surface and role-specific customer, vendor and field views. | **PRODUCT HYPOTHESIS**; **BLOCKED** pending implementation authorization. |
| Custody and condition evidence | No canonical pickup/custody/condition workflow object is implemented by the stop-rent package. | Append evidence events and immutable file references to the authorized rental scope and pickup task. | **PRODUCT HYPOTHESIS**; legal sufficiency is **UNKNOWN**. |
| Granular rental scope | The active stop-rent command remains RFQ-wide. | Adopt the target object boundary below, then implement conservation, lineage, authorization and negative tests before activation. | Target decision is **APPROVED DOCTRINE**; runtime use is **BLOCKED PENDING OBJECT AUTHORITY**. |
| Invoice reconciliation | The stop determination has no invoice matching or correction command. | Reconcile immutable invoice versions and lines to accepted terms, governed scope, determination and evidence; append exceptions and corrections. | **PRODUCT HYPOTHESIS**; **BLOCKED** pending financial object authority. |

### First-slice scope decision

**APPROVED DOCTRINE** — The first `PickupTask` implementation is RFQ-wide only. It may bind one eligible governed off-rent request, its accepted vendor relationship, the controlling customer organization, and the same simulation scope. It must reject line, quantity-allocation, serialized-unit, kit, component, partial-return, split-task, and multi-leg scope inputs.

This sequencing decision permits visible pickup coordination without inventing granular rental authority. The first slice may project aggregate logistics progress, but it cannot claim quantity conservation, unit-level custody, kit completeness, partial completion, or financial effect. Those capabilities remain **BLOCKED PENDING OBJECT AUTHORITY** until the target hierarchy and its invariants are implemented and proven.

## PickupTask target product contract

### Object, purpose, and ownership

**APPROVED DOCTRINE** — In the target architecture, `PickupTask` is a non-financial logistics object for one controlled movement leg of authorized rental scope from an origin to a destination. It is not a rental-stop case, billing clock, invoice, determination, or custody conclusion. The first RFQ-wide slice permits one accepted-vendor-operated movement only; third-party haulers, task splitting, and multi-leg chains remain **UNKNOWN** and blocked.

Every task must map to:

- the controlling organization boundary;
- one accepted vendor organization;
- one customer organization with access to the underlying rental;
- the source off-rent request and correlation identifier;
- an explicit scope manifest;
- origin and destination references;
- an append-only schedule history;
- authorized actor assignments;
- append-only progress, exception and evidence events; and
- an audit event for every material command result.

A task is not created merely because a frontend renders an off-rent request. Creation must occur through one idempotent backend command after rechecking organization, vendor relationship, rental access, simulation scope, current lifecycle prerequisites and duplicate-task constraints.

### Independent state tracks

Do not compress scheduling, execution, custody, condition, exceptions and financial authority into one status.

| Track | Target states | Authority meaning |
| --- | --- | --- |
| Schedule | `unscheduled → proposed → confirmed → reschedule_proposed → confirmed` | Vendor and customer coordination only; no billing effect. |
| Dispatch | `not_dispatched → assigned → en_route → arrived` | Vendor operations progress only. |
| Attempt | `none → attempted → collection_recorded` or `attempted → failed` | Records what the authorized field actor asserted with evidence. A failed attempt does not prove fault. |
| Custody | `not_recorded → origin_handoff_recorded → in_transit_recorded → destination_receipt_recorded` | Evidence-backed assertions; legal custody transfer remains **REQUIRES LEGAL REVIEW**. |
| Condition | `not_inspected → origin_condition_recorded → destination_condition_recorded → review_required_or_clear` | Evidence and human review; no automatic damage liability. |
| Exception | `none → open → action_required → resolved` | Independent operational exception history. Resolution never edits historical events. |
| Task closure | `open → closure_ready → closed_complete`, `closed_partial`, `closed_failed`, `canceled`, or `superseded` | Explicit terminal operational outcome after required tracks; never a billing or off-rent trigger. `closed_partial` is blocked in the first RFQ-wide slice. |

Status transitions must be backend-owned, role-gated, state-gated, simulation-isolated, idempotent and atomically audited. A correction appends a superseding event with a reason and lineage; it does not update or delete the original assertion.

Closure requires every frozen manifest entry to have a recorded operational disposition such as `collected`, `not_found`, `refused`, `inaccessible`, `damaged`, `substituted`, or `canceled`. Required exceptions must be resolved or assigned an explicitly authorized non-financial disposition before terminal closure. Closure cannot silently discard an item, event, exception, or evidence conflict, and it never changes contractual or billing authority.

### Authorized actions and views

| Actor | Allowed target action | Explicit denial |
| --- | --- | --- |
| Customer member with rental access | View progress; confirm or reject a proposed schedule within policy; add access instructions; report an exception | Assign vendor staff, assert collection, change financial authority, edit vendor evidence |
| Accepted vendor dispatcher | Create/propose schedule; assign an eligible vendor actor; reschedule with reason; resolve vendor-owned exceptions | Change accepted terms, determination or customer evidence |
| Assigned vendor field actor | Record en route, arrival, attempt, collection and destination receipt with required evidence | Backdate outside policy, change task scope, determine liability or billing |
| Authorized operations actor | Review exceptions and evidence; initiate a separately governed correction path | Rewrite history, bypass organization or simulation boundaries, invent a contractual rule |
| System | Validate commands, append audit events, project sanitized status, detect missing prerequisites | Select a contractual result, infer legal custody, let AI publish authority |

Customer-visible progress must show the event source and time, distinguish schedule from actual events, and label unsupported or conflicting assertions `UNKNOWN` or `REVIEW REQUIRED` rather than fabricate completion.

## Pickup coordination and custody evidence design

### Scope manifest

Each task requires an immutable versioned manifest. The manifest freezes no later than the earliest of assignment, dispatch, or the first operational event. A manifest entry identifies exactly one approved scope type and quantity. After freeze, a scope change must supersede or split the task through explicit predecessor lineage; it cannot mutate an assigned, dispatched, in-flight, or completed task. Conservation checks are mandatory before granular scope is activated. Multi-leg transport and third-party haulage require a separately approved ownership and handoff model.

Minimum fields are:

- scope type and stable object identifier;
- requested, scheduled, attempted, collected and received quantities where applicable;
- unit of measure;
- serialized identifiers or kit instance identifiers when applicable;
- excluded or unavailable quantity with a structured reason;
- source request and accepted rental-order snapshot references; and
- simulation scope.

### Evidence event

Every operational assertion must be an append-only evidence event containing:

- task, manifest version and rental-scope references;
- event type and schema version;
- authenticated actor, organization, role and assignment reference;
- system-received timestamp and separately labeled actor-asserted timestamp;
- origin/destination or coarse location reference when authorized;
- immutable attachment references with content type, byte length and digest;
- signature or attestation reference when required;
- structured exception and reason codes;
- correlation and idempotency keys;
- simulation scope; and
- predecessor or supersession reference for a correction.

Attachments are evidence, not conclusions. Capture metadata must preserve provenance and privacy boundaries. Geolocation, signatures, photographs and telematics require retention, consent, access, redaction and dispute policies that are currently **UNKNOWN** and may **REQUIRE LEGAL REVIEW**.

Before evidence upload is implemented, the controlled design must define:

- device-capture time, authoritative system-received time, clock source, offset, confidence, and offline sequence separately;
- immutable original bytes and digest, with redacted or transformed derivatives linked to the original rather than replacing it;
- authenticated upload authorization, file-type allowlisting, size limits, protected storage, malware scanning and quarantine;
- audit events for access, download, redaction, quarantine release, retention action, and legal hold;
- signer identity, organization, asserted capacity, intent, attestation text/version, and signature time; and
- custody assertions using explicit outcomes such as `asserted`, `confirmed`, `disputed`, `rejected`, or `unknown` rather than an inferred legal conclusion.

**RESEARCH FINDING** — These controls align with current public security and audit guidance for trustworthy timestamps, protected audit information, retained/retrievable records, unaltered source content, and constrained file uploads. [NIST SP 800-53 Rev. 5.1, AU-7 through AU-11](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final), [OWASP Unrestricted File Upload](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload). Their application to signatures, consent, evidentiary weight, retention, and legal hold remains **REQUIRES LEGAL REVIEW**; electronic form alone does not settle those questions. [15 U.S.C. § 7001](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section7001&num=0&edition=prelim)

### Delay attribution

Delay reporting compares confirmed windows with append-only operational events and assigns only a reviewable candidate category such as customer access unavailable, vendor capacity, weather/safety, site restriction, equipment unavailable, incorrect scope/location, or unknown. Attribution is not fault, liability, a charge, or a billing extension. Any financial use requires an applicable published rule and the governed determination path.

## Target rental-object authority decision

**APPROVED DOCTRINE** — The following is the canonical target product boundary. It resolves the design direction without activating granular runtime authority.

| Object | Target role | Stop/pickup scope decision | Runtime boundary |
| --- | --- | --- | --- |
| RFQ | Sourcing and collaboration envelope | May group requests and provide compatibility with the current command; it is not the long-term billable unit. | Current stop-rent implementation remains RFQ-wide. |
| Rental order | Accepted transaction and commercial envelope | Owns accepted parties, terms and order-wide amendments; may aggregate progress but does not automatically make every line stop together. | Requires a canonical accepted-order object before granular activation. |
| Rental line | Default independently priced commercial scope | Default stop and reconciliation scope when the accepted terms price and govern the line independently. | **BLOCKED PENDING OBJECT AUTHORITY**. |
| Serialized unit | Physical identity and evidence scope | May be a stop scope only when the accepted line/terms bind authority to that unit; otherwise it rolls up to its line allocation. | **BLOCKED PENDING OBJECT AUTHORITY**. |
| Quantity allocation | Versioned portion of a fungible line | Supports partial pickup/return only through conserved, non-overlapping allocations whose total never exceeds the accepted line quantity. | **BLOCKED PENDING OBJECT AUTHORITY**. |
| Kit instance | Atomic commercial scope for a bundle | Defaults to one commercial scope when priced as a kit. It cannot close while required components are unresolved unless an accepted rule permits it. | **BLOCKED PENDING OBJECT AUTHORITY**. |
| Kit component | Custody, completeness and condition scope | Does not become a separate billable/stop scope unless it is an accepted separately priced line or an express published rule grants that treatment. | **BLOCKED PENDING OBJECT AUTHORITY**. |

Required invariants before activation:

1. Every operational allocation belongs to exactly one accepted order and line.
2. Quantity allocations are conserved, versioned and non-overlapping across active tasks and returns.
3. A serialized unit cannot be simultaneously active in conflicting allocations or custody paths.
4. Kit membership and required-component policy are immutable for the accepted snapshot or superseded through explicit lineage.
5. Organization, accepted-vendor, role and simulation scope match across the request, manifest, task, evidence, determination and reconciliation.
6. Granular actions fail closed when accepted terms do not identify the applicable scope.
7. No roll-up may derive a financial cutoff from task completion, pickup or custody alone.

## Invoice reconciliation and append-only correction model

### Reconciliation inputs

**PRODUCT HYPOTHESIS** — A reconciliation run should bind immutable versions of:

- supplier invoice document and invoice lines;
- accepted order, rental lines, rates, units, taxes, fees and amendments;
- authorized quantity allocations and serialized/kit scope where activated;
- governed stop determination and any approved superseding determination;
- delivery, field acceptance, pickup, custody and condition evidence;
- approved ancillary charges and tolerances; and
- prior reconciliation findings, disputes, credits and debits.

### Match results

Each invoice line produces one versioned reconciliation containing:

- one overall disposition: `matched`, `held`, `disputed`, `approval_ready`, or `unknown`;
- zero or more immutable findings such as `underbilled`, `overbilled`, `missing_authority`, `scope_mismatch`, `rate_mismatch`, `quantity_mismatch`, `time_mismatch`, `tax_or_fee_review`, or `duplicate`; and
- zero or more independently governed holds with owner, reason, status, evidence, and resolution lineage.

Every reconciliation records the compared source versions, calculation inputs, tolerance source and explanation. Reconciliation, exception resolution, invoice approval, accounting export, and payment release are separate actions with separate authority. No reconciliation disposition automatically authorizes the next action.

`matched` means the defined comparison passed; it does not prove legal correctness. `unknown` and missing evidence fail closed to review. AI may rank or explain candidate matches but cannot approve an invoice, alter a determination, publish a tolerance, or create a financial correction.

### Append-only correction

Finalized invoices, governed determinations, evidence events and reconciliation versions are never edited or deleted through the normal workflow.

A correction must append a separately authorized record that contains:

- correction type (`credit`, `debit`, `void_candidate`, `reclassification`, or `determination_supersession_reference`);
- original invoice, line and reconciliation references;
- exact amount/quantity and currency/unit affected;
- reason, evidence and authorized approver;
- predecessor/supersession lineage;
- accounting export status without overwriting source history; and
- an audit event in the same transaction as the authoritative state change.

A credit or debit changes settlement; it does not rewrite the contractual stop determination. If the determination itself is wrong, a separate governed determination-correction command must append a superseding determination before reconciliation is rerun. An exposed, revoked or unsupported record is never reactivated as a shortcut.

## Acceptance criteria for the next operational slice

The `PickupTask` slice is not complete unless tests prove all of the following:

1. An authorized accepted-vendor dispatcher can create and schedule a task for the exact eligible request and scope.
2. An unrelated vendor, customer without rental access, unassigned field actor and mismatched simulation actor are denied.
3. Duplicate command retries return the original result without duplicate tasks or audit events.
4. Customer and vendor views expose only the sanitized projection permitted for their organization and role.
5. Progress, attempt, evidence and correction events are append-only and atomically audited.
6. The first slice rejects line, quantity-allocation, serialized-unit, kit, component, partial-return, split-task and multi-leg scope inputs.
7. The manifest freezes before assignment, dispatch, or the first event; later scope changes fail closed rather than mutating it.
8. Missing, malformed or conflicting evidence displays `UNKNOWN` or `REVIEW REQUIRED`.
9. Evidence upload authorization, allowlisting, limits, quarantine, digest preservation, derivative lineage, access audit and timestamp provenance fail closed.
10. Terminal outcomes require complete manifest dispositions and required exception resolution; `closed_partial` remains unavailable in the first RFQ-wide slice.
11. Task closure, collection, destination receipt, signature, photo, acknowledgment and elapsed time do not create or modify a stop determination, billable-through timestamp, lifecycle `off_rent` state or invoice.
12. No frontend or AI output owns authoritative timestamps or state.
13. Existing governed off-rent request, acknowledgment, determination and regression tests remain successful.

## Required implementation sequence

1. **SATISFIED** — PR #10 was merged, and its exact Cloudflare Pages production deployment at commit `f8c44f765287aeeb75ec95d4199a09f3387179fc` was separately verified on 2026-08-13.
2. **REQUIRED** — approve the RFQ-wide command, schema, role matrix, terminal outcomes, manifest-freeze rule, and evidence security boundary. Do not approve granular or partial-return inputs in this slice.
3. **REQUIRED** — implement the RFQ-wide backend object, append-only events, RLS, grants, indexes, audit constraints and negative policy tests before UI mutation controls.
4. **REQUIRED** — add accepted-vendor scheduling and field actions plus a sanitized customer-visible projection backed exclusively by controlled commands.
5. **REQUIRED** — prove that granular inputs, multi-leg/third-party scope, incomplete closure, unauthorized evidence access, and every financial side effect fail closed.
6. **REQUIRED** — run the proportionate local migration, policy, command, unit, type, lint, build and negative-authentication ladder.
7. **REQUIRED** — publish through a separate draft PR. Production deployment, rule publication and merge remain individually authorized actions.

Invoice reconciliation is a later slice. It must not be bundled into the first `PickupTask` implementation merely because this document defines its target contract.

## Remaining decisions and legal gates

- **UNKNOWN** — evidence retention periods, access, export, deletion exceptions, consent and privacy boundaries.
- **UNKNOWN** — offline field-command ordering, device trust, location precision and attachment malware controls.
- **UNKNOWN** — dispatch ownership where a third-party hauler operates for the accepted vendor.
- **UNKNOWN** — multi-leg task ownership, handoff acceptance, split/supersession behavior, and responsibility for third-party evidence.
- **UNKNOWN** — accounting system, tax engine, tolerance publication, invoice ingestion and credit/debit export boundaries.
- **REQUIRES LEGAL REVIEW** — when custody or risk transfers; signature meaning; photographic/geolocation admissibility; damage allocation; pickup-delay liability; lien, tax and jurisdictional requirements.
- **REQUIRES LEGAL REVIEW** — every contractual rule that could use request, acknowledgment, pickup, custody, condition or return evidence in a financial determination.
- **BLOCKED PENDING OBJECT AUTHORITY** — all line-, quantity-, serialized-unit-, kit-, component- and partial-return mutations until the target invariants are implemented and proven.
