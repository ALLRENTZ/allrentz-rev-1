---
title: Stop-Rent Authority Implementation Contract
domain: engineering
lifecycle_status: active
governance_state: approved
authorized_scope: static description of the repository implementation at commit ec6227931509a4f10cc4d046281836f307b724bc; no new rule, object, runtime, deployment, or production authority
authorization_reference: Patrick McGriff, bounded documentation-only governing-product integration, 2026-08-12
authority: subordinate to /ALLRENTZ_CONSTITUTION.md and docs/doctrine/ALLRENTZ_ARCHITECTURAL_FOUNDATION.md; repository code, migrations, policies, tests, configuration, and Git history remain source of truth
related: docs/product/rental-lifecycle-framework.md, docs/strategy/off-rent-governance-benchmark.md
last_reviewed: 2026-08-12
implementation_snapshot: ec6227931509a4f10cc4d046281836f307b724bc
verification_basis: static repository inspection only; runtime verification not rerun for this documentation change
---

# Stop-Rent Authority Implementation Contract

## Decision

**VERIFIED IMPLEMENTATION** — At repository commit `ec6227931509a4f10cc4d046281836f307b724bc`, the `demobilizing → off_rent` transition exists only inside a guarded database command. It remains unreachable unless an authorized request context, an applicable published rule bound through an immutable accepted-term snapshot, an active evaluator version, rule-required evidence, matching authorized RFQ and simulation scope, and a successful system determination all agree.

No universal contractual stop-rent rule is seeded. The current authority boundary is RFQ-wide. Item-, quantity-, serialized-unit-, and kit-level activation is **BLOCKED PENDING OBJECT AUTHORITY**.

This document describes code; it does not enlarge its authority. If this document conflicts with the repository implementation, the implementation governs and this document must be corrected.

## Implemented surfaces

The verified contract is distributed across:

- `supabase/config.toml` — the `rental-stop` Edge Function requires JWT verification;
- `supabase/migrations/20260807113622_off_rent_request_acknowledgment_authority.sql` — request and acknowledgment authority;
- `supabase/migrations/20260807220110_rental_clock_contract_foundation.sql` — evaluator, rule, accepted-term, readiness, attempt, determination, immutability, RLS, and transition authority;
- `supabase/functions/rental-stop/index.ts` — authenticated action adapter;
- `supabase/functions/rental-stop/rentalStopPolicy.ts` and its test — allowlisted action and payload policy;
- `supabase/migrations/rental_clock_contract_foundation.test.ts` — static migration contract checks;
- `supabase/tests/rental_clock_contract_foundation.sql` — database policy and authority assertions; and
- `supabase/tests/rental_clock_concurrency.ps1` — disposable-local concurrency and cleanup harness.

The implemented database objects include versioned evaluator definitions, versioned rule definitions, immutable accepted-term snapshots, versioned readiness declarations, immutable evaluation attempts, and immutable/superseding determinations, in addition to the existing off-rent request and acknowledgment records.

## Canonical command boundary

**VERIFIED IMPLEMENTATION** — `determine_rental_stop_and_transition` is the only implemented database command allowed to advance an RFQ from `demobilizing` to `off_rent`. The transition guard rejects attempts without the command's determination context.

The command checks, within its current RFQ-wide scope:

1. the permitted starting lifecycle state;
2. authenticated actor, organization relationship, and simulation-scope agreement;
3. an authorized off-rent request;
4. a vendor acknowledgment;
5. an immutable accepted-term snapshot matching the RFQ and accepted quote;
6. an applicable published rule version;
7. an active evaluator version;
8. an allowlisted trigger and billing treatment;
9. the evidence required by that trigger; and
10. successful deterministic calculation before atomically writing the determination, audit/state event, and lifecycle transition.

The current seeded evaluator is `postgres.exact_timestamp`. The supported trigger vocabulary includes request received, requested stop, verified readiness, vendor acknowledgment, and pickup availability. Physical-pickup and contract-specific evaluation remain blocked. The implementation does not seed an applicable contractual rule, so no real rental receives financial authority merely from installing the migration.

## Fail-closed outcomes

**VERIFIED IMPLEMENTATION** — Evaluation attempts record `blocked` or `complete`. A blocked attempt uses structured reasons including invalid state, missing request, missing acknowledgment, missing accepted-term snapshot, unknown rule, inactive evaluator, unsupported trigger, missing evidence, and unsupported billing treatment.

`UNKNOWN` is therefore represented by a fail-closed attempt such as `STOP_RULE_UNKNOWN`; it is not an implemented successful determination status. Determination rows are written only for a completed calculation and are immutable. The schema supports supersession lineage, but the Edge Function exposes no governed override or correction action.

The current determination stores an exposure-ceiling field as `NULL`. Pickup, custody, condition, invoice-reconciliation, dispute, and correction workflow objects described in the product framework are target architecture and are not implemented by this package.

## Security and publication controls

**VERIFIED IMPLEMENTATION** — New authority tables use tenant-scoped RLS and explicit Data API grants. Direct authoritative writes are not granted to ordinary authenticated clients; controlled security-definer commands own material mutation. Service-role table grants are constrained to the operations required by the controlled command surface. Request and acknowledgment history cannot be updated or deleted through ordinary client access.

The Edge Function accepts only `POST`, validates the authenticated user, allowlists its actions and payloads, and uses elevated transport only after validation. It exposes publication of evaluator and rule versions, accepted-term binding, readiness declaration, and determination. It does not expose a hidden override action.

Explicit grants are required for new Data API tables under Supabase's current platform behavior. See [Tables are no longer exposed to the Data and GraphQL APIs by default](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically). Edge authentication guidance is recorded in [Supabase Auth with Edge Functions](https://supabase.com/docs/guides/functions/auth).

## Authority exclusions

The following statements are binding descriptions of what is not authorized:

- no universal `demobilizing → off_rent` contractual rule exists;
- no frontend state, AI result, `RentalStopCase`, pickup status, acknowledgment, physical custody event, or party-selected timestamp determines billing;
- acknowledgment is a required input in the current command, not financial authority by itself;
- no platform custom, competitor workflow, general vendor terms, or research finding is an applicable rule;
- no rental-order, line, serialized-unit, quantity-allocation, kit, or component activation is implemented; and
- no production deployment, credential use, hosted mutation, or runtime verification is granted by this document.

## Verification record and remaining limits

The repository contains static, policy, database, adapter, Edge Function, concurrency, and cleanup verification assets for this package. **VERIFIED IMPLEMENTATION** in this document is based on static inspection of the committed implementation and its test contracts at the snapshot above. Runtime verification was not rerun for this documentation-only integration.

The following remain **UNKNOWN** or blocked until separately decided and implemented:

- which contract-supported rule families should be published first;
- the canonical rental-order/line/unit/quantity/kit authority model;
- physical-pickup and contract-specific evaluator semantics;
- the governed correction, dispute, and override command model;
- ceiling calculation and legally meaningful lock semantics;
- evidence retention, legal hold, and jurisdiction requirements; and
- production deployment behavior for any future implementation revision.
