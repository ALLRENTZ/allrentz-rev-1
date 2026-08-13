---
title: Rental Lifecycle and Clock-Control Framework
domain: product
lifecycle_status: active
governance_state: candidate
authorized_scope: approved product doctrine and target architecture; no contractual-rule publication, runtime activation, or object-scope authorization
authorization_reference: Patrick McGriff, bounded documentation-only governing-product integration, 2026-08-12; target object-boundary reconciliation, 2026-08-13
authority: subordinate to /ALLRENTZ_CONSTITUTION.md and docs/doctrine/ALLRENTZ_ARCHITECTURAL_FOUNDATION.md
related: docs/engineering/stop-rent-authority-implementation-contract.md, docs/strategy/off-rent-governance-benchmark.md, docs/product/pickup-custody-and-invoice-control-requirements.md
last_reviewed: 2026-08-13
---

# Rental Lifecycle and Clock-Control Framework

## Governing decision

ALLRENTZ controls the connected industrial rental lifecycle. It does not infer
commercial authority from a physical status and it does not let either party
unilaterally choose a billing timestamp.

**APPROVED DOCTRINE** — The governing chain is:

> Accepted terms → authorized request → verified facts and evidence → deterministic
> system calculation → immutable determination → governed correction, if required

Unknown contract terms, missing evidence, conflicting facts, and unsupported
billing treatments block a consequential determination. The platform preserves
the failed-closed outcome and structured blocker; it never manufactures a default.

## Current verified implementation boundary

**VERIFIED IMPLEMENTATION** — As of repository commit
`ec6227931509a4f10cc4d046281836f307b724bc`, backend-authoritative operations exist
for field acceptance, on-rent activation, off-rent request, vendor acknowledgment,
accepted-term binding, readiness declaration, deterministic stop evaluation, and
the guarded lifecycle transition described below.

> The `demobilizing → off_rent` transition is implemented only as a guarded,
> database-owned mechanism. It must remain unreachable unless an authorized
> request context, applicable published rule bound through an immutable
> accepted-term snapshot, active evaluator version, rule-required evidence,
> matching authorized RFQ and simulation scope, and successful system
> determination all agree. No universal contractual stop-rent rule is authorized
> or seeded. Item-, quantity-, serialized-unit-, and kit-level activation remains
> blocked until a canonical rental-scope authority model is approved and enforced.

The current command requires vendor acknowledgment and operates only at RFQ scope.
Its evaluation attempts are `blocked` or `complete`; an unknown rule fails closed
as `STOP_RULE_UNKNOWN`. A determination is written only after successful
calculation. The schema supports immutable supersession lineage, but no governed
override or correction action is exposed. Exposure-ceiling calculation, physical-
pickup and contract-specific evaluators, and the target operational tracks below
are not implemented by the current package.

The exact implemented database and Edge Function contract is controlled separately
in `docs/engineering/stop-rent-authority-implementation-contract.md`. This product
framework cannot expand that implementation boundary.

## Connected lifecycle

Need → Search → RFQ → Vendor Match → Quote → Technical and Commercial Approval →
Rental Order → Pre-Dispatch Packet → Release Authorization → Dispatch → Delivery
and Field Acceptance → On-Rent Determination → Active Rental Control → Stop-Rent
Request → Readiness Declaration → Vendor Acknowledgment → Stop-Rent Determination →
Pickup → Custody Transfer → Yard Receipt → Return Inspection → Cleaning and
Certification → Final Packet → Invoice Reconciliation → Dispute Resolution →
Closeout → Vendor Performance

No stage is an isolated feature. Every material action maps to a business object,
authorized actor, state change or determination, audit event, evidence set, and
owned next action.

## Independent target control tracks

**APPROVED DOCTRINE** — The lifecycle must expose independent, coordinated tracks
so a pickup, acknowledgment, dispute, or correction cannot silently stand in for
a financial determination. The candidate progressions below are **PRODUCT
HYPOTHESIS**: they are proposed projections over governed objects and events, not
client-editable authority and not implemented database states.

| Target track | Candidate progression | Controlling source |
| --- | --- | --- |
| Request | `not_requested → received → amended → cancelled_or_closed` | Authorized immutable request versions |
| Rule coverage | `unassessed → covered → unknown_or_blocked` | Applicable published rule plus accepted-term snapshot |
| Vendor response | `not_required_or_pending → acknowledged → pickup_proposed → exception_raised` | Accepted-vendor response events; never billing authority alone |
| Determination | `not_attempted → blocked_or_complete → superseded` | Deterministic database evaluator and immutable version chain |
| Pickup | `not_requested → requested → scheduled → attempted → completed` | Authorized logistics events and evidence |
| Custody | `customer → carrier → vendor → service_provider → released` | Signed custody events and manifests |
| Condition | `unknown → declared → inspected → exception_open → resolved` | Equipment-class evidence and authorized inspection |
| Reconciliation | `not_started → matched → exception_open → adjusted → closed` | Determination, invoice, credit, and approved adjustment evidence |
| Dispute | `none → raised → evidence_complete → resolved_or_escalated` | Governed dispute workflow and decision authority |
| Correction | `none → proposed → approved_or_rejected → superseding_record_issued` | Separately authorized correction command and immutable lineage |

`PARTIAL` is a scope/completion dimension—for example, some requested lines or
quantities complete while others remain open—not a universal ticket or financial
status. `UNKNOWN`, `BLOCKED`, and `DISPUTED` retain distinct meanings.

`off_rent_effective_at`, `billable_through_at`, `physical_pickup_at`, and
`custody_transferred_at` are distinct facts. None is silently substituted for
another.

### RentalStopCase projection

**PRODUCT HYPOTHESIS** — `RentalStopCase` may become a non-authoritative operational
projection that assembles the independent tracks, next actions, blockers,
explanations, and evidence references for a governed rental scope. It may improve
coordination and observability, but it must never own accepted terms, publish
rules, calculate billing, mutate canonical lifecycle state, or replace source
records. It is rebuilt from authoritative objects and events and must expose stale,
conflicting, missing, and superseded inputs rather than flattening them.

`RentalStopCase` is not currently an implemented database object.

## Canonical objects

Unless a passage is marked **VERIFIED IMPLEMENTATION**, the objects and fields in
this section are target architecture. They do not represent deployed tables,
statuses, commands, or financial authority.

### Rental agreement and terms

**VERIFIED IMPLEMENTATION** — The current stop-rent foundation binds an accepted
quote and RFQ through an immutable term snapshot. **PRODUCT HYPOTHESIS** — The
future rental-order model should become the commercial envelope, and each affected
change order should create a new version rather than rewriting the prior version.

Required term fields include:

- source document/reference and SHA-256 digest;
- customer and vendor organizations;
- accepted quote/order and version;
- stop trigger basis;
- billing treatment;
- rate schedule and currency;
- minimum rental period;
- billing cycle, cutoff, rounding, and grace rules when applicable;
- possession-versus-usage treatment;
- pickup SLA and failed-pickup terms;
- delay and exception allocation;
- cleaning, damage, missing-component, and certification treatment;
- contract time zone and jurisdiction;
- authority and acceptance timestamps.

Absence of any required value is represented explicitly and blocks the dependent
calculation.

### Rule catalog

**APPROVED DOCTRINE** — The rule library is layered so extracted language cannot
become financial authority merely by being stored:

1. **Source and clause layer** — source document, immutable bytes or governed
   reference, clause location, verbatim extract, capture metadata, parties,
   effective dates, amendments, jurisdiction, and reviewer provenance.
2. **Applicability layer** — customer/vendor pair, accepted transaction, equipment
   class, geography, time range, order and object scope, precedence, exceptions,
   and explicit conflict/unknown outcomes.
3. **Published rule layer** — versioned trigger, billing treatment, typed
   parameters, evidence requirements, evaluator version, effective interval,
   publisher authority, predecessor/supersession lineage, and approval record.
4. **Accepted-term binding layer** — an immutable snapshot connecting the accepted
   quote/order and applicable source clauses to one published rule version.
5. **Execution-evidence layer** — authorized request, readiness, acknowledgment,
   pickup/custody/condition facts required by the bound rule.
6. **Verification layer** — deterministic algorithm, boundary/time-zone cases,
   positive and negative tests, explanation template, monitoring, and correction
   requirements.

The catalog contains only versioned, allowlisted evaluator types and typed
parameters. It never stores arbitrary executable SQL or user-authored code.
AI-extracted clauses and mappings remain candidate research until an authorized
publisher validates the source, applicability, precedence, semantics, and tests.

The target trigger-family vocabulary is:

- request received;
- requested stop time;
- verified readiness;
- vendor acknowledgment;
- pickup availability;
- physical pickup;
- contract-specific evaluator;
- unknown.

The target billing-treatment vocabulary is:

- exact timestamp;
- calendar-day treatment;
- minimum period;
- fixed cycle;
- cycle threshold;
- possession based;
- usage based;
- contract-specific evaluator;
- unknown.

Listing a family does not authorize a calculation. Each evaluator requires an
approved field contract, deterministic algorithm, boundary/time-zone handling,
positive tests, and negative tests before it may produce financial authority.

No reviewed research source or general vendor term is an ALLRENTZ rule. Actual
accepted transaction documents and qualified legal review are required wherever
meaning, precedence, enforceability, or jurisdiction is material.

### Stop-rent request

**VERIFIED IMPLEMENTATION** — An authorized customer actor may request stop-rent
at the current RFQ-wide boundary. **PRODUCT HYPOTHESIS** — After the line/unit model
is approved and enforced, a request may address selected lines, quantities,
serialized units, or kit components and may contain multiple scoped items.

The platform records independently:

- `stop_request_received_at`;
- `requested_stop_at`;
- `pickup_available_from` and `pickup_available_until`;
- requesting actor and organization;
- site contact and equipment location;
- customer notes;
- immutable confirmation/correlation number;
- request scope and version;
- readiness declaration and evidence references.

### Readiness declaration

**VERIFIED IMPLEMENTATION** — The current foundation stores a versioned RFQ-wide
readiness declaration with explicit uncertainty. **PRODUCT HYPOTHESIS** — The
complete industrial model should become structured, equipment-class-aware evidence. It supports
`confirmed`, `not_confirmed`, `unknown`, and `not_applicable` rather than forcing
false certainty.

The core declaration captures:

- ready time and location;
- operating state;
- isolation state;
- drained/decontaminated state;
- safe-access state;
- pickup window;
- component/kit manifest;
- photos, signatures, meters, and other evidence references;
- declaration version and actor.

Equipment-class extensions cover heat exchangers, tanks, boilers, hoses, berms,
mats, classified-location equipment, and later specialty categories without
hard-coding one form for all equipment.

### Vendor acknowledgment

**VERIFIED IMPLEMENTATION** — The accepted vendor can confirm receipt, proposed pickup window, and operational
facts. Acknowledgment does not grant the vendor authority to select the financial
stop timestamp.

### Stop-rent determination

**VERIFIED IMPLEMENTATION** — The current system evaluator consumes the applicable
accepted-term snapshot, authorized request, readiness declaration, required vendor
acknowledgment, published rule, active evaluator, and rule-required evidence.

**PRODUCT HYPOTHESIS** — The complete target evaluator should additionally consume,
when required by the accepted rule:

- relevant pickup/custody evidence;
- approved exception events;
- prior determination when issuing a correction.

**VERIFIED IMPLEMENTATION** — A successful current calculation produces
`stop_effective_at`, `billable_through_at`, currency, calculation inputs/outputs,
rule and term references, determination version, and immutable audit/state effects.

**PRODUCT HYPOTHESIS** — The complete target output should also include:

- exposure ceiling when the rate schedule supports it;
- human-readable explanation;
- evidence references;
- prior determination reference when superseding.

The determination and its ledger event are immutable. **PRODUCT HYPOTHESIS** — A
future governed correction command should append a superseding version and preserve
the entire chain. **VERIFIED IMPLEMENTATION** — The current schema validates
supersession lineage, but the current Edge Function does not expose a governed
correction or override action.

### Determination explainability

**PRODUCT HYPOTHESIS** — Every completed or blocked determination should produce a
reproducible explanation containing:

- rental scope and simulation boundary;
- accepted-term snapshot, source clauses, precedence result, rule version, and
  evaluator version;
- request, readiness, vendor-response, and other required evidence versions;
- normalized timestamps, time zone, cutoff/rounding decisions, and calculation
  inputs and outputs;
- structured blocker or completion reason;
- facts explicitly not used as authority; and
- the next authorized action, owner, prerequisites, and correction path.

An explanation describes the deterministic result. It cannot amend the contract,
waive missing evidence, or serve as AI-created authority.

## Billing ceiling lock — target architecture

**PRODUCT HYPOTHESIS** — At request time, ALLRENTZ should show the customer the maximum exposure supported
by the currently accepted terms and verified facts.

The result is labeled:

- `PROJECTED` when facts or required evidence remain open;
- `LOCKED` when all contract inputs are known and no open exception can change the
  calculation;
- `SUPERSEDED` when a governed correction replaces it.

Vendor-controlled pickup latency cannot silently increase the ceiling when the
accepted contract assigns that risk to the vendor. Customer-caused extensions or
fees require the accepted contractual basis, structured attribution, evidence,
notice, and a superseding determination.

An exposed or revoked determination is never edited back into authority.

**VERIFIED IMPLEMENTATION** — The current determination record has an exposure-
ceiling field but writes it as `NULL`; no ceiling calculation or legally meaningful
lock is implemented.

## Rental-scope boundary, partial return, and kit accountability

**APPROVED DOCTRINE** — The target object hierarchy and product-design direction
are defined below and expanded in
`docs/product/pickup-custody-and-invoice-control-requirements.md`. This approval
does not activate granular runtime authority; implementation remains **BLOCKED
PENDING OBJECT AUTHORITY**.

| Object | Proposed authority boundary |
| --- | --- |
| RFQ | Pre-award sourcing and current implementation compatibility scope; it must not remain the long-term billable object. |
| Rental Order | Accepted commercial envelope connecting parties, terms, currency, site, and order versions; not automatically the narrowest billing scope. |
| Rental Line | Default separately priced and billable scope when accepted terms price the line. |
| Serialized Unit Allocation | Physical assignment and evidence scope; separately billable only when accepted terms bind price and stop authority to the unit. |
| Quantity Allocation | Versioned allocation of a fungible line quantity; partial stop requires conserved requested, delivered, accepted, stopped, returned, and outstanding quantities. |
| Kit Instance | Default billable scope for a bundled kit unless accepted terms price components separately. |
| Kit Component | Custody, completeness, condition, and claim evidence by default; separate stop/billing authority only when represented by an accepted priced line or expressly authorized component rule. |

The precise target relationship is:

> Turnaround Project → RFQ → Rental Order → Rental Line → Serialized Unit
> Allocation or Quantity Allocation → Kit Instance → Kit Component

Partial stop-rent must operate at the narrowest contractually billable level. The
system must reconcile:

- ordered manifest;
- delivered manifest;
- field-accepted manifest;
- stop-requested scope;
- pickup manifest;
- yard-received manifest;
- inspection findings.

Missing fittings, gauges, hoses, caps, containment, or other components create a
separate evidenced claim. They do not automatically create unlimited rental
accrual.

**VERIFIED IMPLEMENTATION** — The current guarded command remains RFQ-wide.
The repository now defines the target product boundary, but it does not implement
the rental-order, line, serialized-unit, quantity-allocation, kit-instance, and
kit-component authority objects, controlled commands, conservation rules, or
negative policy tests. Item-, quantity-, serialized-unit-, kit-, component-, and
partial-return activation is therefore **BLOCKED PENDING OBJECT AUTHORITY**. A
generic JSON identifier is not an acceptable substitute.

## Exception model

**PRODUCT HYPOTHESIS** — Exceptions should be append-only events with party attribution, contract basis,
evidence, notice, financial effect, and resolution. Required categories include:

- vendor pickup delay;
- inaccessible site;
- equipment still operating or not isolated;
- wrong pickup location;
- failed pickup attempt;
- missing components;
- damage claim;
- cleaning or certification;
- retroactive correction;
- contract ambiguity.

The final reason-code catalog remains `UNKNOWN`. It must be approved with the
workflow and audit schema before implementation; free text may preserve context
but cannot independently authorize money.

## Pickup-delay attribution — target architecture

**PRODUCT HYPOTHESIS** — Operational delay should be measured independently from
the financial stop determination. A delay interval should identify the governing
rental scope, expected and actual event, interval start/end, responsible or
unresolved party, structured reason, evidence, accepted-term basis when financial
effect is proposed, notice, disputed state, and supersession history.

Candidate attribution families include vendor capacity, carrier delay, customer
access, equipment not ready, unsafe condition, incorrect location, failed attempt,
weather/force majeure, regulatory hold, and unresolved cause. These families do
not authorize charges. Pickup status, elapsed time, acknowledgment, physical
custody, or AI classification must never move the billing timestamp without an
applicable published rule and system determination.

The reason catalog, causal standard, time allocation, financial treatment, and
approval matrix are `UNKNOWN` and **REQUIRES LEGAL REVIEW** where they affect money
or contractual responsibility.

## Invoice reconciliation — target architecture

**APPROVED DOCTRINE** — Every final invoice charge within the governed scope must
be reconciled without allowing reconciliation to rewrite the determination it
consumes. **PRODUCT HYPOTHESIS** — The target workflow should compare each vendor
invoice and credit line to the accepted commercial snapshot, rental scope, rate
schedule, system determination, approved adjustments, taxes/fees,
pickup/custody/condition evidence, and prior reconciliation versions.

The target output separates:

- exact matches;
- quantity, rate, period, cutoff, tax, fee, damage, cleaning, and missing-component
  exceptions;
- amounts supported, unsupported, disputed, credited, or awaiting evidence;
- deterministic explanation and source references; and
- the next authorized owner and action.

An invoice, credit memo, tolerance, or AI match does not revise the rental-stop
determination. Corrections must occur through the separately governed object that
owns the defect, after which reconciliation consumes the superseding record.

## Governed lifecycle metrics

**PRODUCT HYPOTHESIS** — The lifecycle should measure request-to-determination,
determination-to-pickup, failed-pickup frequency, readiness completeness, response
time, evidence completeness, invoice-match rate, exception value, dispute cycle
time, verified credits, and vendor performance by governed event and object scope.

Metric definitions must record source events, calculation version, comparison
period, denominator, exclusions, simulation treatment, owner, and uncertainty.
“Savings” or “prevented accrual” remains `UNKNOWN` until an approved, reproducible
counterfactual and accounting treatment exist. Metrics guide improvement; they do
not create authority for a rental, vendor, invoice, or contractual rule.

## Authority matrix

This matrix combines **APPROVED DOCTRINE** with target actions. Rows for exception
resolution and determination correction do not assert that an implementation
command already exists.

| Action | Authorized owner | Explicit prohibition |
| --- | --- | --- |
| Request stop-rent | Current customer member with rental authority | Vendor or unrelated tenant |
| Cancel a pending request | Authorized customer under an approved cancellation rule | Silent deletion |
| Declare readiness | Authorized field/coordinator actor | System inference from UI state |
| Acknowledge request and propose pickup | Member of accepted vendor organization | Any vendor merely invited to the RFQ |
| Confirm physical pickup | Authorized driver/field actor with evidence | Changing billing terms |
| Calculate determination | Deterministic system evaluator | Customer, vendor, frontend, or AI selecting a timestamp |
| Resolve contract exception | Approved operations/manager authority | Unrecorded manual override |
| Supersede determination | Approved correction command with evidence | UPDATE or DELETE of history |

Role alone is insufficient. Every action also requires current organization
membership, object relationship, permitted starting state, required evidence,
simulation-scope match, replay protection, and an atomic ledger event.

## Implementation sequence

These are delivery phases of one architecture, not a reduced MVP and not
permission to substitute temporary models.

1. **Authority foundation** — versioned rules, immutable term snapshots, explicit
   unknowns, readiness declarations, determinations, RLS, and contract tests.
2. **Deterministic evaluators** — approve and implement each trigger/billing pair,
   time-zone boundaries, ceiling projections, and negative cases.
3. **RFQ-wide pickup coordination** — add one non-financial, RFQ-wide pickup task
   for the eligible governed request, accepted vendor, customer organization, and
   simulation scope. Reject line, quantity, serialized-unit, kit, component,
   partial-return, split-task, multi-leg, and third-party-hauler inputs. Task state,
   evidence, closure, custody assertions, and elapsed time have no billing effect.
4. **Order/line/unit model** — create the authoritative rental-order, line,
   serialized-unit, quantity, and kit-component hierarchy; then enable granular
   logistics and partial stop-rent only through separately approved commands.
5. **Expanded field logistics and custody** — quantity-aware scheduling, driver
   actions, pickup attempts, frozen manifests, signatures, photos, multi-leg
   handoffs, custody assertions, and yard receipt.
6. **Return control** — comparison evidence, inspection, damage, cleaning,
   recertification, and rental-ready release.
7. **Financial settlement** — ceiling lock, invoice line matching, exceptions,
   governed adjustments, disputes, closeout, and vendor-performance outputs.

Before production activation, every new financial evaluator must pass the
non-authoritative governed shadow-mode boundary in
`docs/doctrine/ALLRENTZ_ARCHITECTURAL_FOUNDATION.md`. Shadow output cannot change
lifecycle state, determinations, invoices, accounting records, or financial
outcomes.

Each phase must preserve one canonical mutation path, explicit grants, tenant RLS,
append-only auditability, and executable positive and negative verification.

## Decisions still required

The architecture does not answer these business questions and the code must not
guess them:

1. Which stop-trigger and billing-treatment combinations ALLRENTZ will support
   first from signed customer/vendor contracts.
2. The authoritative rental-order, line, serialized-unit, quantity, and kit model.
3. The exception reason-code and approval matrix.
4. Billing-cycle boundary semantics, cutoff rules, daylight-saving treatment, and
   jurisdiction requirements.
5. When a ceiling becomes legally `LOCKED` rather than operationally `PROJECTED`.
6. Who may publish platform rules and organization-pair rules.
7. Retention, legal hold, and dispute-evidence requirements.
8. Which equipment classes require isolation, decontamination, hydrotest,
   third-party cleaning, or other readiness/certification fields.

Until each decision is supported by verified contract evidence and approved
authority, its runtime result remains `BLOCKED` or `UNKNOWN`.
