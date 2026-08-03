---
title: ALLRENTZ Stage 2I and Stage 2A Principal Authority Implementation Specification
domain: engineering
specification_id: ALLRENTZ-AUTH-002
revision: 0.6
lifecycle_status: active
governance_state: approved
authorized_scope: implementation planning only; no schema, code, runtime, deployment, or production execution
authorization_reference: ALLRENTZ Product Owner approval and documentation-only commit authorization in the controlled Codex session on 2026-07-27
current_approved_baseline: revision 0.6 approved by the ALLRENTZ Product Owner on 2026-07-27
supersedes: revision 0.5 at original local commit 65b6772b4a5e4638b31dedcd42b4eee1cfe1d651, published byte-identically at 8deefce1b6991bca606f2627e3bdd2e36df65093
decision_status: revision 0.6 approved as the implementation-planning baseline; pinned dependency/toolchain evidence and exact replay commands are recorded; the separate CI-hardening prerequisite was merged through PR #6; Stage 2I implementation remains unauthorized
validation_status: complete documentation diff, final hashes, empty-index confirmation, scoped whitespace validation, package-file preservation, and excluded-artifact preservation passed before the approved documentation-only commit
publication_erratum: ALLRENTZ-PR8-DOC-ERRATUM-001 — publication provenance and CI-prerequisite status only; approved revision 0.6 remains normatively unchanged
publication_erratum_authorized_on: 2026-08-03
publication_erratum_authorization_reference: ALLRENTZ Product Owner status-correction authorization on 2026-08-02 through 2026-08-03 and publication-erratum authorization on 2026-08-03 in controlled Codex sessions
created_on: 2026-07-23
candidate_opened_on: 2026-07-26
approved_on: 2026-07-27
approved_by: ALLRENTZ Product Owner
authority: subordinate to /ALLRENTZ_CONSTITUTION.md, docs/doctrine/ALLRENTZ_ARCHITECTURAL_FOUNDATION.md, and ALLRENTZ-AUTH-001 v1.0
related: docs/engineering/stage-2-authority-architecture-specification.md, docs/engineering/authority-first-loop.md
last_reviewed: 2026-08-03
---

# ALLRENTZ Stage 2I and Stage 2A Principal Authority Implementation Specification

## 1. Decision and authorization boundary

This approved revision `0.6` pins the disposable dependency/toolchain evidence, defines the clean-replay and hosted Preview command contracts, records the separately completed CI-hardening prerequisite, and corrects stale candidate language. Publication erratum `ALLRENTZ-PR8-DOC-ERRATUM-001` changes only publication provenance and current CI-prerequisite status. It does not change the selected authority architecture, amend the approved implementation plan, or authorize Stage 2I implementation.

Revision `0.6` supersedes revision `0.5` at original local commit `65b6772b4a5e4638b31dedcd42b4eee1cfe1d651`, published byte-identically at commit `8deefce1b6991bca606f2627e3bdd2e36df65093`, as the current approved implementation-planning baseline. It converts the ratified `ALLRENTZ-AUTH-001` architecture into a bounded implementation plan for:

1. Stage 2I shadow authority initialization foundations; and
2. Stage 2A principal-access expansion, cutover, and acceptance.

It incorporates four product-owner implementation decisions:

1. external manifest custody and digest-bound independent approval;
2. administrator initialization and recoverable quorum;
3. equipment-data progressive disclosure; and
4. evidence-based Realtime containment.

This document does not supersede or amend `ALLRENTZ-AUTH-001` revision `1.0`. The ratified architecture controls if this implementation plan conflicts with an invariant, state meaning, authority decision, or approved product decision.

This documentation change does not authorize:

- schema, migration, RLS, RPC, Edge Function, frontend, test-fixture, or generated-type changes;
- creation or configuration of a 1Password, e-signature, SIEM, S3, or other external service;
- local or hosted Supabase execution;
- database reads or writes;
- production or remote-system access;
- branch creation, staging, commit, push, PR, merge, or deployment;
- changes to `MASTER_PRIORITY_BOARD.md`; or
- changes to intentionally excluded local artifacts.

Every later implementation or execution tranche requires an exact file, command, environment, and acceptance boundary approved separately.

## 2. Relationship to the ratified Stage 2 sequence

`ALLRENTZ-AUTH-001` defines semantic completion stages:

- Stage 2A — authoritative principal-access state;
- Stage 2B — authority-source and principal-kind separation; and
- Stage 2C — privileged platform-role Actions.

This document introduces **Stage 2I** as a physical deployment-preparation tranche. Stage 2I may prepare dormant prerequisites used by more than one ratified semantic stage, but it closes none of them.

The distinction is:

| Boundary | Meaning | May create effective authority? | May claim a ratified stage complete? |
| --- | --- | ---: | ---: |
| Stage 2I | Shadow schema, compatibility hooks, inventory, manifest contract, dry-run tooling | No | No |
| Stage 2A Expand | Backward-compatible principal-aware clients and backend checks before the latch | No new authority | No |
| Stage 2A Cutover | Approved dispositions, minimum initialization authority, and principal-access enforcement | Yes, exactly as approved | No, until full acceptance |
| Stage 2A Acceptance | Runtime proof across every protected path | No additional authority | Stage 2A only, when every Stage 2A gate passes |
| Ratified Stage 2B | Complete principal-kind and authority-source separation | Only through approved migration and grants | Only after all Stage 2B tests pass |
| Ratified Stage 2C | Ordinary privileged-role request, approval, grant, suspension, restoration, and revoke Actions | Yes, through dual-controlled Actions | Only after all Stage 2C tests pass |

Deploying a dormant principal registry or manifest table in Stage 2I is a physical ordering decision, not a claim that Stage 2B is complete. Creating minimum approved administrator grants during cutover does not authorize the ordinary Stage 2C role-management workflow.

The two previously verified authority blockers remain open until the ratified Stage 2A, Stage 2B, and Stage 2C contracts pass together.

## 3. Controlling doctrine

Every implementation decision remains traceable through:

> **Object → Authorized Action → State Change → Audit Event → Next Step**

The authority evaluation order is:

1. authenticated identity;
2. authoritative principal registry;
3. current principal-access state;
4. participation basis;
5. platform or organization authority;
6. scoped grants, qualifications, and restrictions;
7. governing-object relationship;
8. canonical workflow state;
9. current required evidence;
10. exact named Action and version;
11. atomic result, audit event, and next obligation.

Authentication, profile data, JWT convenience claims, frontend state, AI output, service credentials, or existence of a database row never independently creates authority.

## 4. Stage 2I shadow-only contract

### 4.1 Permitted Stage 2I work

Subject to separate implementation authorization, Stage 2I may prepare:

- authoritative principal-registry foundations;
- shadow principal-access records;
- Principal Activation Case foundations;
- restriction and remediation-case foundations;
- narrow authority-obligation foundations;
- protected authority Action events;
- authority-Action idempotency records;
- manifest metadata and single-use consumption foundations;
- an authority runtime-state record initialized to `pre_cutover`;
- concurrent-signup handling that preserves required legacy signup writes while atomically creating one non-authoritative, fail-closed shadow principal and `pending_activation` record;
- dormant compatibility helpers;
- read-only inventory and dry-run tooling;
- manifest validation tooling;
- local-only shadow verification.

### 4.2 Prohibited Stage 2I outcomes

Stage 2I must not:

- enable principal-access enforcement;
- apply a production or hosted manifest;
- activate a principal;
- restrict, suspend, disable, or restore a principal;
- create an effective organization membership;
- create ordinary effective administrator authority;
- change any current RLS authorization outcome;
- remove legacy compatibility;
- set the enforcement latch;
- make a workload or unclassified principal operational;
- change RFQ, quote, vendor, customer, organization, or cross-tenant authority;
- access hosted or production authority state; or
- claim that Stage 2A, Stage 2B, or Stage 2C is complete.

### 4.3 Shadow compatibility invariant

Before cutover:

- existing legitimate workflows behave exactly as they did before Stage 2I;
- shadow records grant nothing;
- absence or presence of a shadow record changes no effective permission;
- `pending_activation` is a shadow classification only and does not deny a legacy-authorized operation before the enforcement latch;
- dormant helpers return the pre-cutover compatibility outcome only in `pre_cutover`;
- service-role and security-definer paths remain governed by their existing controls; and
- new shadow tables, cases, events, manifests, and obligations are inaccessible to ordinary clients.

## 5. Authoritative object contracts

Logical names define behavior and do not authorize final SQL identifiers.

### 5.1 Principal Registry

The Principal Registry answers what identity is being evaluated. It does not grant participation.

Required concepts:

- immutable principal identifier;
- immutable principal kind after controlled classification: `human` or `workload`;
- classification state: `unclassified`, `classified`, or `invalidated`;
- authentication-identity reference when applicable;
- environment binding;
- identity-assurance state: `unverified`, `verified`, or `invalidated`;
- accountable human and organization for workloads;
- verification source and evidence references;
- created, superseded, and invalidated timestamps;
- immutable provenance and version.

`unclassified` is a fail-closed classification state, not a third principal kind. An unclassified registry record has no assigned principal kind and cannot hold a human platform role, organization authority, or operational grant.

Anonymous, demo, test, shared, imported, orphaned, service, scheduled, automated, and AI-controlled identities must be explicitly reconciled. They must never be inferred to be eligible humans from an email address, profile, name, metadata field, or existing role label.

Authentication provenance is environment-scoped. The live identity mapping enforces one `auth_subject_reference` per environment through a uniqueness contract equivalent to `UNIQUE (environment_id, auth_subject_reference)`. An identical Auth UUID in local, preview, staging, and production represents separate identity evidence unless an explicit governed reconciliation links the principals. Email is mutable routing/contact data and never an immutable identity key.

### 5.2 Principal Access Record

The Principal Access Record answers whether a principal may currently participate.

The storage contract is one current, versioned Principal Access Record per principal. Named Actions mutate that current row in place under optimistic version and concurrency controls. Immutable Authority Events preserve every prior state and transition. There is never more than one current or effective principal-access row for one principal.

Required concepts:

- principal identifier;
- canonical access state;
- state version;
- effective and expiration times;
- safe external reason code;
- protected internal reason/evidence reference;
- transition source;
- correlation and causation identifiers;
- created and updated timestamps.

The canonical states remain:

- `pending_activation`;
- `active`;
- `restricted`;
- `suspended`; and
- `disabled`.

An `active` record past its exclusive `expires_at` boundary is ineffective without waiting for a scheduler.

### 5.3 Principal Activation Case

Activation operates on one durable governed case.

Required concepts:

- case identifier and version;
- principal identifier;
- expected principal kind;
- expected Principal Registry version;
- activation basis;
- requested persona as a non-authoritative routing or participation request;
- governed membership-disposition reference, if organization participation is requested;
- evidence references and evidence status;
- requester and assigned reviewer;
- approval decision and reason;
- issue and expiration times;
- correlation identifier;
- next authority obligation;
- case state.

Permitted case states may include:

- `draft`;
- `awaiting_evidence`;
- `ready_for_review`;
- `approved`;
- `rejected`;
- `expired`; and
- `consumed`.

An approved case does not itself create authority. The named activation Action must reread the Principal Registry, verify the expected kind and version, revalidate all evidence and independently governed membership decisions, and consume the case atomically. A copied case value, requested persona, profile field, or membership request cannot override the Principal Registry or create authority.

### 5.4 Restriction and Remediation Case

No Action may transition a principal into `restricted` until the reason-specific remediation contract exists.

The contract requires:

- one restriction record;
- safe user-facing reason;
- separate protected internal reason;
- explicit remediation allowlist;
- evidence requirements;
- submission records;
- review state;
- assigned reviewer and escalation owner;
- release or restoration decision;
- separate release/restoration Action;
- required revalidation of affected grants; and
- immutable audit history.

Remediation submission never restores access, membership, a role, or another grant.

### 5.5 Authority Obligation

Stage 2 does not create a generic enterprise workflow engine. It uses a narrow authority-obligation object for durable next steps.

Required concepts:

- obligation type;
- governing authority object;
- responsible principal or role;
- required evidence;
- due or review time;
- blocking or non-blocking classification;
- state;
- completion Action;
- correlation identifier; and
- terminal outcome when no further Action exists.

Notifications may announce an obligation. They are never the obligation or its source of truth.

### 5.6 Authority Event

Successful authority mutations produce an application-immutable, append-only authority event in the same database transaction.

Required concepts:

- Action identifier, type, and version;
- actor, target, and acting organization when applicable;
- governing objects;
- prior and resulting state;
- reason and evidence references;
- policy and authority versions;
- effective decision timestamp;
- correlation and causation identifiers;
- idempotency reference;
- next obligation or terminal outcome; and
- result.

Authority-event protection requires:

- direct client INSERT, UPDATE, and DELETE privileges revoked;
- ordinary authenticated and service execution unable to UPDATE or DELETE events;
- INSERT permitted only through controlled Actions that atomically produce the governed result;
- no ordinary update or delete RPC;
- no ordinary deployment or migration path that rewrites accepted history;
- an emergency correction represented by preserved recovery evidence and a compensating event rather than silent history replacement; and
- database-owner or equivalent intervention classified as an external recovery procedure, never normal application behavior.

These records are application-immutable and append-only under ordinary client, authenticated, service, Action, and deployment paths. PostgreSQL superuser, database-owner, or equivalent control-plane access remains outside claims of absolute immutability.

Named backend Actions record sanitized denied-attempt evidence. Raw RLS-filtered reads rely on provider and database technical logs until a separately approved collection path exists. This specification does not claim universal database events for every RLS denial.

### 5.7 Platform Role Grant

`platform_role_grants` is the final canonical storage foundation for platform-level authority, not a temporary bootstrap table. It may represent only approved platform roles such as `platform_admin` and `operations_manager`; customer and vendor personas or organization roles never migrate into it.

Required concepts:

- immutable grant identifier;
- human principal identifier and environment binding;
- exact platform role;
- grant state and monotonically increasing version;
- `[effective_at, expires_at)` term;
- origin and governing approval references;
- correlation and causation identifiers;
- superseded, suspended, revoked, and expired outcomes; and
- immutable Authority Events for every accepted mutation.

Grant effectiveness is derived at request time. It is never stored as a mutable `is_effective` Boolean. The decision must evaluate the authority runtime state, grant state and version, effective window, principal kind and classification, current assurance and access state, role eligibility, and every applicable suspension, revocation, or supersession. Mutable history is not duplicated in JSON or convenience columns.

Stage 2I creates no effective canonical platform grant. Until the approved cutover, existing platform-admin and operations-manager behavior remains temporarily sourced from legacy `user_roles`. Stage 2I records and tools may inventory that legacy provenance but may not silently convert it.

### 5.8 Private authority schema and execution boundary

Shadow authority tables, internal functions, and transition machinery belong in a non-exposed `authority_private` schema that is absent from the Data API exposed-schema configuration. API callers receive no `USAGE` on that schema.

The implementation must:

- revoke private-schema `USAGE`, direct table and sequence access, and all private-function execution from `PUBLIC`, `anon`, `authenticated`, and `service_role`;
- harden the actual object-creating role's global default function privileges before any private function is created;
- give `service_role` no direct table access to private authority objects;
- expose only narrowly scoped `SECURITY DEFINER` Action wrappers in an approved Data API schema; under the current file boundary that schema is `public`, and a dedicated `api` schema would require an explicit `supabase/config.toml` boundary amendment;
- grant callers only `USAGE` on the approved exposed schema and `EXECUTE` on the exact wrapper signatures they require;
- require each wrapper to derive and validate the initiating principal, requested Action, current state, and object scope before invoking fully qualified private machinery;
- fully qualify object references;
- use `search_path = pg_catalog, pg_temp` and fully qualified application-object references;
- revoke `PUBLIC` function execution in the same migration transaction; and
- provide no generic actor-ID parameter or service-authority oracle.

No ordinary caller receives private-schema `USAGE` merely to reach a function. Internal RLS integration must use a separately reviewed safe evaluator surface or another explicitly approved privilege pattern; it cannot silently reopen private-schema access. Stage 2I changes no RLS outcome and need not expose an ordinary-client Action wrapper.

Every private object and function requires an explicit ownership outcome. Stage 2I uses one dedicated non-login role, `allrentz_authority_owner`, and Pattern B: direct creation under the final owner. Stage 2I performs no schema, table, sequence, or function ownership transfer. Pattern A remains a documented, non-selected alternative and cannot be used as an automatic fallback; future use requires separate review and authorization.

#### 5.8.1 Local ownership evidence and selected pattern

Authorization `ALLRENTZ-AUTH-002-STATUS-0.4-20260723` records a controlled local capability probe executed on 2026-07-23 against PostgreSQL `17.6` in the local `supabase_db_encqbibzgoarvtcivgra` container through direct container execution. No credential value was displayed or recorded.

The first Pattern A transaction failed closed because it attempted to transfer table ownership before transferring ownership of the containing schema. A new database session confirmed zero residual probe roles, memberships, schemas, relations, functions, sequences, or probe grants. A corrected schema-first Pattern A transaction passed and rolled back cleanly, but required temporary database-level `CREATE` and ownership transfers.

A later bounded comparison proved that Pattern B can:

- create the private schema with `AUTHORIZATION allrentz_authority_owner`;
- create its table, sequence, and hardened `SECURITY DEFINER` function directly under the final owner;
- operate while the owner has no database-level `CREATE`;
- contain the default `PUBLIC` function-execution privilege for existing and future owner-created functions;
- deny private authority to application and provider workload roles; and
- remove the explicit temporary migration membership before commit.

Pattern B therefore provides the smaller persistent privilege surface and the clearer fail-closed migration contract. Revision `0.5` records Pattern B as the selected Stage 2I ownership model.

A separate disposable Supabase CLI `2.45.5` `roles.sql` experiment established:

- `roles.sql` executed with `session_user`, `current_user`, and `current_role` equal to `postgres`;
- owner creation produced PostgreSQL's automatic creator membership for `postgres`, granted locally by `supabase_admin`, with `ADMIN TRUE`, `SET FALSE`, and `INHERIT FALSE`;
- repeated `db push --local --include-roles` reused the same role OID;
- local `db reset` recreated the cluster and role, changed the system/container/OID evidence, reprocessed `roles.sql`, and reproduced the automatic creator edge;
- Pattern B passed without owner database-level `CREATE`;
- an intentionally failed transaction removed its temporary membership and objects through rollback; and
- cleanup and new-session reconciliation found zero disposable probe roles, memberships, schemas, relations, sequences, functions, grants, containers, networks, or volumes.

The experiment is classified **ACCEPT_CONTROL_PLANE_INVARIANT_LOCALLY**. It does not prove hosted or production behavior. `roles.sql` is rejected specifically as the Stage 2I owner-provisioning mechanism because it does not remove the managed creator relationship and adds a second cluster-role lifecycle. This is not a general claim that Supabase `roles.sql` is unsupported or unsafe.

All local ownership evidence is classified **LOCALLY VERIFIED; NOT YET INDEPENDENTLY OR HOSTED-PREVIEW VERIFIED**. The probes did not access or mutate application tables and make no application-row reconciliation claim.

#### 5.8.2 Managed control-plane invariant and identity boundary

ALLRENTZ accepts PostgreSQL/Supabase's automatic creator relationship—granted role `allrentz_authority_owner`, member `postgres`—as a managed database control-plane invariant when its observed semantics are `ADMIN TRUE`, `SET FALSE`, and `INHERIT FALSE`. This acceptance does not convert `postgres`, `supabase_admin`, a database owner, or a provider control-plane identity into an application principal. Those identities remain outside ordinary application authority and inside separately controlled database administration and recovery.

The trusted control-plane boundary is limited to:

- the managed Supabase database administration plane;
- an explicitly authorized `postgres` database-administration session;
- the separately authorized migration or recovery session executing the reviewed migration; and
- any human, CI, developer, or automation identity only for the duration and scope in which it possesses that approved administration session.

Any temporary control-plane participant requires exact identity attribution, an environment restriction, the reviewed migration or commit digest, time-bounded credential availability where the provider permits it, independent approval, audit evidence, and post-run reconciliation. This specification records those requirements; it does not claim that every current local or hosted mechanism already supplies them.

The following identities are outside direct private-authority trust: `PUBLIC`, `anon`, `authenticated`, `authenticator`, `service_role`, `supabase_auth_admin`, `supabase_storage_admin`, ordinary application and Edge Function sessions, background workloads, analytics identities, normal test identities, AI agents, and developer or CI identities without an explicitly approved database-administration session. They receive no private-schema `USAGE`, private relation or sequence privileges, or private-function execution. `service_role` bypassing RLS does not grant private-schema or private-object authority and is not a substitute for this privilege boundary.

The dedicated owner reduces the ordinary migration and runtime privilege surface. It does not claim protection from `postgres`, `supabase_admin`, the database owner, a provider operator, or another equivalent control-plane identity.

#### 5.8.3 Idempotent owner validation

Owner establishment is a closed-world operation:

1. if `allrentz_authority_owner` is absent, create it with exactly `NOLOGIN`, `NOINHERIT`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, and `NOBYPASSRLS`, then verify the complete state;
2. if it already exists, do not normalize or alter it; verify the complete attribute, ownership, and membership contract and abort on any mismatch;
3. if concurrent creation produces a duplicate-role race or the observed state changes between precheck and use, abort and reconcile rather than silently skipping or repairing; and
4. require the owner to have no effective database-level `CREATE`, whether direct, inherited, obtained through `PUBLIC`, or obtained through another membership.

`NOLOGIN` is the enforced no-login boundary. Catalog evidence must not be described as proving the absence of every possible password representation. No application or workload role may be a member of the owner role, and no unexpected membership edge may be tolerated.

The managed automatic creator edge must match the environment's independently observed control-plane contract. The local grantor was `supabase_admin`; hosted execution must discover and validate the actual grantor and semantics instead of assuming the local value.

#### 5.8.4 Pattern B transactional sequence

A separately authorized Stage 2I migration must execute in one explicit transaction and preserve this order:

1. assert the expected environment, PostgreSQL version range, `session_user`, `current_user`, `current_role`, migration digest, owner presence or absence, complete owner attributes, memberships, database privileges, and absence of conflicting private objects;
2. create the owner only when absent, or exact-validate it when present;
3. validate the managed automatic creator edge and reject unknown or additional control-plane edges;
4. grant the migration identity one explicit temporary owner membership with `ADMIN FALSE`, `SET TRUE`, and `INHERIT FALSE`;
5. create `authority_private` with `AUTHORIZATION allrentz_authority_owner`;
6. execute `SET LOCAL ROLE allrentz_authority_owner`;
7. before creating any function, globally harden the owner's default function privileges with `ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`; do not add `IN SCHEMA`, because a schema-specific default-privilege revocation does not override PostgreSQL's global default `PUBLIC EXECUTE`;
8. create the private table, sequence, function, and other private objects directly under the final owner, with fully qualified application-object references and `search_path = pg_catalog, pg_temp`;
9. explicitly `REVOKE ALL` on every exact private-function signature from `PUBLIC` as defense in depth, even though the global owner default has already been hardened;
10. execute `RESET ROLE`;
11. remove only the migration identity's temporary grant by its exact grantor, using the equivalent of:

   ```sql
   REVOKE allrentz_authority_owner
   FROM postgres
   GRANTED BY postgres;
   ```

12. run every postcondition from the migration identity and commit only when all assertions pass.

The literal migration identity and grantor must be derived from and pinned to the approved execution environment; `postgres` above records the locally verified form and is not an unverified hosted assumption. Grantor-specific removal must preserve the separately accepted managed control-plane edge. Stage 2I performs no ownership transfer and grants the owner no database-level `CREATE`.

#### 5.8.5 Fail-closed postconditions and hosted Preview gate

The migration must abort on false, unknown, duplicate, or ambiguous evidence. Before commit it must prove:

- exact owner attributes and no effective database-level `CREATE`;
- the exact accepted managed creator edge, the absence of the temporary migration edge, and no unexpected member, membership direction, grantor, `ADMIN`, `SET`, or `INHERIT` option;
- exact owner identity for the private schema and every contained relation, sequence, and function;
- no ownership-transfer operation in the reviewed migration;
- global owner default privileges remove `PUBLIC` execution for future functions;
- effective `PUBLIC` function/default privileges are inspected through ACL expansion, including `aclexplode(...)` rows whose grantee is OID `0`, rather than by treating `PUBLIC` as a login role;
- every named application or workload role fails the applicable effective schema, relation, sequence, and function privilege checks;
- every `SECURITY DEFINER` function has the exact safe `search_path`, fully qualified references, an explicit per-signature `PUBLIC` revocation, and no generic supplied actor-ID authority path;
- no private object appears in a Data API exposed schema;
- `service_role` has no direct private-object path despite its RLS-bypass capability; and
- rollback or failure is followed by a new-session reconciliation that proves zero partial owner, membership, schema, object, default-ACL, or grant residue attributable to the failed attempt.

Hosted Supabase Preview verification is a mandatory pre-merge gate. It must run the exact reviewed migration and independently record executor identities, PostgreSQL version, owner attributes, managed-edge grantor and options, temporary grant and grantor-specific removal, default and object ACLs, application-role denials, direct-final ownership, safe function configuration, rollback/failure behavior, and fresh-session reconciliation. Any difference from the approved control-plane contract fails closed and returns the implementation for review. Local success does not authorize Preview, merge, deployment, or production use.

### 5.9 Authentication identity lifecycle

Authority history must survive deletion of an authentication identity. No foreign key from the Principal Registry, Principal Access Record, platform-role grant, Authority Event, or evidence record may cascade-delete authority history from `auth.users`.

The identity link uses:

- a nullable live `auth_user_id` reference with `ON DELETE SET NULL`;
- a separate immutable `auth_subject_reference` suitable for provenance without containing a credential and unique only within its `environment_id`; and
- `auth_identity_deleted_at` for the observed identity-loss event.

During Stage 2I, Auth deletion makes future authentication impossible but does not invoke a canonical access transition, because shadow state is non-enforcing and Stage 2I is prohibited from restricting or disabling a principal. Stage 2A must define and verify the separate backend-controlled identity-loss Action before enforcement.

## 6. Principal-access transition contract

### 6.1 Allowed transitions

| Current state | Permitted target | Additional requirement |
| --- | --- | --- |
| `pending_activation` | `active` | Valid unexpired Activation Case consumed by a basis-specific Action |
| `pending_activation` | `restricted` | Complete remediation contract exists for the exact reason |
| `pending_activation` | `suspended` | Authorized security/administrative basis |
| `pending_activation` | `disabled` | Authorized closure basis |
| `active` | `restricted` | Complete remediation contract exists |
| `active` | `suspended` | Authorized security/administrative basis |
| `active` | `disabled` | Authorized closure basis |
| `restricted` | `active` | Separate approved release/restoration Action |
| `restricted` | `suspended` | Authorized security/administrative basis |
| `restricted` | `disabled` | Authorized closure basis |
| `suspended` | `active` | Separate restoration Action and required credential/session response |
| `suspended` | `restricted` | Separate restoration into a complete remediation contract |
| `suspended` | `disabled` | Authorized closure basis |
| `disabled` | successor active access term through an elevated reactivation process | Stronger evidence and approval; never generic restoration or in-place rewrite |

`active → pending_activation` is not a valid transition. Testing `pending_activation` uses a separately created pending principal.

### 6.2 Activation and membership

Principal activation and organization membership remain separate governed records.

One Action may commit both only when:

- the activation decision is independently valid;
- the membership decision is independently valid;
- the requested organization is current and eligible;
- the exact membership role and term are approved;
- neither approval is inferred from the other;
- two correlated domain events remain distinguishable; and
- the transaction commits both or neither.

The initialization manifest may inventory organization relationships and use them as evidence. It must not silently rewrite or preserve a membership merely because the principal becomes active. Every effective membership result requires an explicit authorized disposition.

### 6.3 Disabled re-onboarding

`disabled` is terminal for the current effective access term.

A previously disabled identity requires:

- a new Activation Case linked to prior history; and
- a separately defined elevated reactivation Action with stronger evidence and approval that advances the one current access record to a successor version and records the successor authorization event.

The prior disabled state remains preserved in immutable Authority Events. No second concurrently effective access row is created. No prior membership, platform role, scoped grant, qualification, session, credential, or invitation becomes effective automatically.

## 7. Decision 1 — Manifest custody and approval

### 7.1 Approved rule

The Stage 2 initialization manifest will be retained in a dedicated encrypted external governance vault outside Git, ordinary chat, email, migration files, developer folders, and the production database.

The external vault provides encrypted custody and access evidence. It is not, by itself, the approval authority.

Two independent humans must each create or execute an approval record bound to the same:

- canonical manifest digest;
- manifest identifier;
- environment identifier;
- policy version;
- schema and Action compatibility versions;
- single-use nonce;
- expiration;
- exact requested Actions; and
- inventory snapshot.

The preparer cannot create an approval on another person's behalf. The same human cannot satisfy both approvals through multiple identities.

Each approval record must be produced by a governed approval or e-signature workflow, or by a system-generated approval Action executed through an individually authenticated account. An ordinary editable JSON document is not sufficient approval evidence.

Every approval record binds:

- approver identity and current eligibility version;
- manifest and inventory snapshot digests;
- environment, policy, schema, and Action versions;
- decision and decision timestamp;
- approval-system event identifier;
- independent-authentication evidence reference; and
- correlation identifier.

The approval evidence contains no credential, factor secret, recovery code, or raw identity document. The operational custody provider, vault, custodians, named approvers, and approval product remain pending until separately authorized. Policy acceptance does not select or configure a vendor.

### 7.2 Canonical package

The manifest uses:

- UTF-8 without a byte-order mark;
- a versioned restricted JSON input profile and RFC 8785 canonical JSON serialization;
- SHA-256 over the canonical representation;
- UTC timestamps;
- `[issued_at, expires_at)` validity;
- a cryptographically random non-secret single-use nonce; and
- stable opaque references that map unambiguously to immutable identity evidence.

There is exactly one canonical byte source. A pinned, vetted Node module performs canonicalization. PowerShell orchestrates file handling and hashing but never reconstructs, serializes, or text-normalizes the manifest. PostgreSQL receives the exact canonical bytes, recomputes SHA-256 over those bytes, validates the parsed envelope and approved compatibility versions, and never attempts to recreate RFC 8785 bytes from `jsonb`.

The database transport is binary:

> canonical manifest bytes → binary parameter (`bytea`) or strict base64 decoding into `bytea` → SHA-256 over that `bytea` → digest comparison → fatal UTF-8 decode and JSON/profile parsing

Hashing an ordinary database `text` value, driver newline or encoding conversion, Unicode normalization, or JSON reserialization before digest verification is prohibited. If a driver cannot bind the raw bytes as `bytea`, it transmits strict base64 and the controlled database function decodes it exactly once. Parsing is permitted only after the received-byte digest matches the approved digest.

The wrapper reads raw bytes and, in order:

1. rejects a UTF-8 byte-order mark;
2. decodes with fatal UTF-8 error handling;
3. parses JSON while rejecting duplicate properties;
4. validates the versioned restricted profile, including lone-surrogate rejection;
5. canonicalizes through the exact pinned Node dependency;
6. encodes the result as UTF-8 without a byte-order mark;
7. requires byte-for-byte equality between the approved manifest input and the canonical output; and
8. only then computes SHA-256.

The manifest is never manually edited after creation. Any semantic or byte change requires a new digest, nonce, expiration, approval records, and package.

The restricted profile permits objects, arrays, strings, Booleans, `null`, and nonnegative integers from `0` through `9,007,199,254,740,991` inclusive. It rejects floating-point values, negative zero, duplicate properties, malformed Unicode, lone surrogates, implicit Unicode normalization, and larger numeric literals. UUIDs, digests, timestamps, monetary values, and identifiers that may exceed the safe-integer range are strings. Every manifest declares a `canonicalization_profile_version`. Arrays retain their schema-defined order.

Canonicalization is an executable compatibility contract, not merely an RFC reference. Shared, versioned conformance vectors must prove:

- duplicate object property names are rejected before semantic parsing;
- malformed Unicode and lone surrogates are rejected;
- floating-point values, negative zero, and unsafe integers are rejected;
- nested object properties use the required deterministic ordering;
- array order is preserved;
- output is UTF-8 without a byte-order mark;
- the Node canonicalizer and PowerShell-orchestrated hash operate on the same bytes; and
- the database verifier accepts those exact bytes and digest and rejects every altered vector.

The tooling has two explicit modes:

- **BUILD** accepts structured, validated inventory dispositions and produces canonical bytes, digest, and package.
- **VERIFY** accepts approved raw bytes and performs byte/profile validation, re-canonicalization, byte equality, hashing, approval-envelope validation, and database verification without rebuilding the document.

The test-vector set is digest-bound to the compatibility version and consumed by both modes. No implementation may normalize invalid input into an apparently valid manifest.

Authorization `ALLRENTZ-AUTH-002-STATUS-0.4-20260723` approves `canonicalize@3.0.0` only as an exact Stage 2I development/governance dependency for later separately authorized implementation. It must be recorded as the exact `devDependency` value `"3.0.0"`. Frontend and production application code must not import it. Package CLIs, `npx`, remotely resolved `npm exec`, globally installed canonicalization tools, floating versions, automatic dependency upgrades, audit fixes, deduplication, and unrelated lockfile normalization are prohibited. Every later version change requires a fresh bounded review.

The 2026-07-23 preflight confirmed the published `3.0.0` tarball integrity, six-file contents, Apache-2.0 license, ESM export, Node `>=18` engine, absence of runtime/optional/peer dependencies, absence of install lifecycle scripts, byte-for-byte correspondence of published files with source tag `v3.0.0`, and 35 passing upstream tests. Targeted behavior checks also confirmed that the dependency is a serializer, not the ALLRENTZ restricted-profile validator; the governed wrapper and conformance vectors remain mandatory.

The separately authorized 2026-07-26 evidence resolution downloaded the two exact registry tarballs into a unique operating-system temporary directory, verified their registry integrity before use, unpacked npm without installing it, invoked npm only as `node <verified-unpacked-path>/package/bin/npm-cli.js`, and removed the disposable directory after reconciliation. No `npx`, `npm exec`, global installation, repository package operation, or application lifecycle script was used.

The canonicalization artifact is pinned as:

| Evidence | Exact value |
| --- | --- |
| Metadata URL | `https://registry.npmjs.org/canonicalize/3.0.0` |
| Tarball URL / lockfile `resolved` | `https://registry.npmjs.org/canonicalize/-/canonicalize-3.0.0.tgz` |
| Registry SRI / lockfile `integrity` | `sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==` |
| Registry SHA-1 | `a8073c48c1835631e1829d759078d2bbf48487fc` |
| Tarball SHA-256 | `F6C9B99A28B884A32053994735004ADD11474DDED38EC342414E53F7FB1E1F19` |

The exact npm generator artifact and interpreter are pinned as:

| Evidence | Exact value |
| --- | --- |
| npm metadata URL | `https://registry.npmjs.org/npm/10.9.8` |
| npm tarball URL | `https://registry.npmjs.org/npm/-/npm-10.9.8.tgz` |
| npm registry SRI | `sha512-fYwb6ODSmHkqrJQQaCxY3M2lPf/mpgC7ik0HSzzIwG5CGtabRp4bNqikatvCoT42b5INQSqudVH0R7yVmC9hVg==` |
| npm registry SHA-1 | `61c71897ecbee5bb1ee17e2fe50ebff07828fa9a` |
| npm tarball SHA-256 | `3E68F9B5FCAF1A94BA0E37E6A565C920B2BE6BD98998C50970385D6A692AF780` |
| Unpacked CLI relative path | `package/bin/npm-cli.js` |
| Unpacked CLI SHA-256 | `8E5F6F3429F8CDBE693CDC29904E9D5A7B127A494BD15C804BD54C7403BFCBE7` |
| Node executable | `C:\Program Files\nodejs\node.exe` |
| Node version and generator host | `v22.19.0`; `win32` / `x64` |
| Node executable SHA-256 | `995A3FB3CEFAD590CD3F4B321532A4B9582FB9C6575320ED2E3E894CAAC3E362` |

The approved lockfile generator for this mutation is exactly npm `10.9.8`, not a permanent repository-wide npm standard. The disposable-copy simulation from the approved baseline produced only:

- the exact root `devDependency`;
- the exact root lockfile dependency declaration; and
- the exact `node_modules/canonicalize` record with immutable resolution and integrity metadata.

The resulting `node_modules/canonicalize` lock record is exactly:

```json
{
  "version": "3.0.0",
  "resolved": "https://registry.npmjs.org/canonicalize/-/canonicalize-3.0.0.tgz",
  "integrity": "sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==",
  "dev": true,
  "license": "Apache-2.0",
  "bin": {
    "canonicalize": "bin/canonicalize.js"
  },
  "engines": {
    "node": ">=18"
  }
}
```

It removed zero unrelated entries. A deep semantic comparison confirmed that all other manifest and lockfile content was unchanged. A subsequent frozen `npm ci` left the generated manifest and lockfile byte-for-byte unchanged and installed `canonicalize` version `3.0.0`. This result is classified **VERIFIED IN A DISPOSABLE COPY; NOT YET APPLIED TO THE REPOSITORY**. By contrast, npm `11.6.0` removed 27 unrelated optional/esbuild entries and is not authorized to generate this mutation.

Generation and frozen verification must clear inherited `NPM_CONFIG_*`, `NODE_ENV`, and `NODE_OPTIONS`; use empty disposable user and global npmrc files; use a disposable cache; and pin the same dependency-tree-affecting options. The verified generator platform is `win32` / `x64`; platform, CPU, libc, historical `before`, workspace, and omission overrides are prohibited. An implementation run on another generator platform requires a fresh disposable no-churn proof. With all other configuration sources empty, the exact common option set is:

```powershell
$npmTreeOptions = @(
  '--registry=https://registry.npmjs.org/'
  "--cache=$disposableCache"
  "--userconfig=$emptyUserNpmrc"
  "--globalconfig=$emptyGlobalNpmrc"
  '--install-strategy=hoisted'
  '--legacy-peer-deps=false'
  '--strict-peer-deps=false'
  '--include=dev'
  '--include=optional'
  '--include=peer'
  '--workspaces=false'
  '--include-workspace-root=false'
  '--install-links=true'
  '--prefer-dedupe=false'
  '--package-lock=true'
  '--lockfile-version=3'
  '--format-package-lock=true'
  '--omit-lockfile-registry-resolved=false'
  '--ignore-scripts=true'
  '--audit=false'
  '--fund=false'
  '--color=false'
  '--loglevel=error'
)
```

After the npm and Node digests above have been revalidated, the only authorized generator and frozen-install forms are:

```powershell
Get-ChildItem Env:NPM_CONFIG_* | Remove-Item
Remove-Item Env:NODE_ENV,Env:NODE_OPTIONS -ErrorAction SilentlyContinue

& $nodeExe $npmCli install canonicalize@3.0.0 `
  '--package-lock-only=true' `
  '--save-dev=true' `
  '--save-exact=true' `
  @npmTreeOptions

& $nodeExe $npmCli ci @npmTreeOptions
```

The generator runs only in a disposable copy first. Acceptance requires the same three-entry semantic delta and zero unrelated additions, removals, or rewrites. The repository mutation, if separately authorized, must reproduce that exact result. `npm ci` must leave `package.json` and `package-lock.json` byte-for-byte unchanged. The package and lockfile may enter the repository only under the separately approved Stage 2I implementation boundary.

#### 7.2.1 Revision 0.6 candidate evidence and digest contract

The revision `0.6` candidate evidence was reviewed on branch `fix/profile-authority-stage1-containment` at HEAD `65b6772b4a5e4638b31dedcd42b4eee1cfe1d651` with Git `2.51.0.windows.1`. The candidate content diff is exactly:

- `docs/README.md`; and
- `docs/engineering/stage-2i-stage-2a-principal-authority-implementation-specification.md`.

`git diff --name-only` returned exactly those two candidate paths, and the Git index was empty. This statement describes the candidate content diff, not an otherwise clean working tree. `git status --porcelain=v2` also retained the intentionally excluded tracked `CLAUDE.md` change and the intentionally excluded untracked `AGENTS.md`, `docs/allrentz-handoff/`, `supabase/gate2_setup.sql`, and `supabase/gate2_tests.ps1` artifacts. Their approved preservation fingerprints remained unchanged, and none is part of this candidate.

Each individual document digest is SHA-256 over that file's raw bytes, without line-ending or encoding normalization. The external approval record—not either self-hashed document—must bind the two individual digests and the combined digest.

The combined digest is SHA-256 over UTF-8 bytes without a byte-order mark representing the following two manifest lines in this exact order:

```text
docs/README.md|<uppercase README raw-file SHA-256><LF>
docs/engineering/stage-2i-stage-2a-principal-authority-implementation-specification.md|<uppercase specification raw-file SHA-256>
```

The separator between path and digest is one ASCII vertical bar (`|`). The separator between records is one LF byte (`0A`). There is no final newline. Paths use forward slashes and are case-sensitive. The calculation is reproducible with:

```powershell
$documentPaths = @(
  'docs/README.md'
  'docs/engineering/stage-2i-stage-2a-principal-authority-implementation-specification.md'
)
$digestManifest = foreach ($documentPath in $documentPaths) {
  $rawFileDigest = (Get-FileHash -Algorithm SHA256 -LiteralPath $documentPath).Hash.ToUpperInvariant()
  "$documentPath|$rawFileDigest"
}
$digestBytes = [System.Text.UTF8Encoding]::new($false).GetBytes(
  [string]::Join("`n", $digestManifest)
)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
try {
  $combinedDigest = (
    [System.BitConverter]::ToString($sha256.ComputeHash($digestBytes))
  ).Replace('-', '')
} finally {
  $sha256.Dispose()
}
```

The final digest values are intentionally not embedded into either hashed document because doing so would change the documents and make their own approval digests self-referential. They belong in the separate product-owner approval record together with the revision, branch, HEAD, and exact two-file path set.

#### 7.2.2 Publication provenance erratum

Publication erratum `ALLRENTZ-PR8-DOC-ERRATUM-001` was authorized on 2026-08-03 to reconcile the publication history after the approved work was rebased for PR #8. It preserves each original local commit as historical approval evidence and adds the verified byte-identical published commit for remote review:

| Evidence | Original local commit | Published byte-identical commit |
| --- | --- | --- |
| Stage 1 authority containment | `35cae877704d0beb013fc54a77d160e5a4173075` | `20848efedcf53cd212cbfba1bad64c55ce2db906` |
| `ALLRENTZ-AUTH-002` revision `0.2` | `c4f382bfdc6168345c7ca1dda6298e4e83435275` | `272dc9c40f0d485e1da1965a96b87083772b8b1a` |
| `ALLRENTZ-AUTH-002` revision `0.4` | `848952fc5c97127e72e72f7abd5bd360c81cf806` | `3c18646d00325d5897e1074b7773fd627ba1eb55` |
| `ALLRENTZ-AUTH-002` revision `0.5` | `65b6772b4a5e4638b31dedcd42b4eee1cfe1d651` | `8deefce1b6991bca606f2627e3bdd2e36df65093` |
| `ALLRENTZ-AUTH-002` revision `0.6` | `13358f9c99dab75b03b8d6f297edbaa067206964` | `2b9ca273f37ada990dd8ac69083d68ee395bf249` |

The original commits remain the historical authorization references; the published commits are their remote-review equivalents. Neither replaces the other. This erratum changes no normative decision, implementation scope, authority rule, or execution authorization. Its new document digests remain outside the self-hashed documents and are bound in the separately authorized completion record.

The protected package contains logical equivalents of:

- `manifest.json`;
- `manifest.sha256`;
- two independently created approval records;
- `evidence-index.json`;
- package instructions and compatibility information; and
- the post-cutover receipt when available.

It contains no:

- passwords;
- access or refresh tokens;
- MFA secrets or recovery codes;
- service credentials;
- raw identity evidence;
- unnecessary personal information; or
- unrestricted database extracts.

### 7.3 Required manifest content

The manifest includes:

- manifest and environment identifiers;
- environment classification;
- policy, schema, and Action versions;
- issue and expiration times;
- nonce;
- inventory snapshot digest;
- counts by authoritative source;
- one explicit disposition per in-scope principal claim;
- stable source-record and evidence references;
- target principal;
- prior source and authority classification;
- exact resulting access or initialization authority;
- exact revocation or fail-closed outcome;
- required next obligations; and
- expected post-cutover reconciliation.

One total `principal_count` is insufficient. Source counts and the inventory snapshot digest must detect omission, duplication, or concurrent change.

### 7.4 Database record

PostgreSQL stores only the minimum verification and consumption record:

- manifest ID;
- environment ID;
- canonical digest;
- inventory snapshot digest and source counts;
- policy/schema/Action versions;
- issue and expiration times;
- approval references and verified approver identifiers;
- nonce digest;
- consumption state and time;
- cutover Action and correlation identifiers; and
- result.

The complete manifest and raw evidence remain outside PostgreSQL.

### 7.5 1Password fast-custody profile

If 1Password Business is selected:

- use a dedicated `ALLRENTZ Authority Governance` vault;
- grant the minimum vault permissions;
- remove ordinary export, sharing, move, print, archive, and delete permissions where supported;
- use individual identities and MFA;
- do not give a service account initial write authority;
- require each approver to create their own approval record;
- retain vault item versions and audit evidence;
- export audit events to durable retention before the provider's ordinary retention window expires; and
- treat prior downloaded copies as residual exposure that cannot be recalled.

1Password is custody, not cryptographic proof of approval and not WORM storage.

An established e-signature or governed approval product may supply stronger independent approval without creating a custom signature system.

### 7.6 Post-cutover receipt

Database commitment is the authority result. External receipt delivery is post-commit.

If receipt delivery fails:

- the cutover remains committed;
- an authority obligation is created;
- delivery is retried through an approved manual or automated process;
- the failure is recorded technically; and
- bootstrap or migration is never reopened.

Write-once retention such as S3 Object Lock may be added later. It is not required for Stage 2I shadow preparation.

## 8. Decision 2 — Administrator initialization

### 8.1 Approved rule

ALLRENTZ will initialize three independently verified human platform administrators whenever three eligible candidates are available.

When only two can be safely established, the ratified two-human exception is permitted for no more than 30 calendar days as an explicit product-owner risk acceptance.

While fewer than three independently recoverable administrators exist:

- the only ordinary platform-role expansion permitted is the dual-approved grant required to reach three;
- dual approval cannot be relaxed;
- bootstrap cannot be reopened;
- the obligation must have a named owner and deadline;
- overdue status must be prominent to current administrators; and
- essential containment and recovery remain permitted under their exact contracts.

After three are established, later administrator changes use the ratified Stage 2C Actions.

### 8.2 Eligibility

During initialization, every administrator candidate must be:

- one individually identified human;
- represented by one unique eligible human principal;
- in individual control of credentials and recovery;
- enrolled in the required strong factor;
- approved for an `active` principal-access disposition in the same initialization manifest;
- independently verified under current policy;
- non-shared;
- non-demo and non-test;
- non-workload, non-service, non-automation, and non-AI-controlled; and
- independently approved rather than grandfathered from a legacy label.

Nobody approves their own eligibility or grant. Multiple accounts controlled by one person do not establish independence.

During the atomic initialization cutover, an eligible candidate may receive the approved `active` principal-access disposition and exact initialization administrator grant together. Neither result may commit alone.

After cutover, every new, restored, extended, or materially changed administrator grant requires an already-active eligible human principal under canonical Principal Access, plus the ratified Stage 2C approval contract. The initialization exception cannot be reused.

### 8.3 Initialization versus ordinary role administration

Stage 2A cutover may create only the exact minimum administrator grants approved by the initialization manifest.

It does not authorize the full ordinary role-management system.

Principal-access Actions belong to Stage 2A. Ordinary platform-role request, approval, grant, revoke, role-suspension, restoration, extension, and revalidation belong to ratified Stage 2C.

Global principal suspension and suspension of one platform-role grant are different objects and Actions.

## 9. Decision 3 — Equipment-data progressive disclosure

### 9.1 Product rule

ALLRENTZ may provide strong public equipment discovery and structured RFQ entry. It must not become a passive public vendor-inventory, availability, or pricing directory.

A search result must lead toward:

> **Discovery context → equipment clarification → structured RFQ draft → technical completeness → authorized matching**

### 9.2 Tier 1 — Public discovery

Public access may expose allowlisted:

- equipment category and subtype;
- generic description;
- typical applications;
- generic technical specifications;
- required RFQ technical fields;
- broad ALLRENTZ sourcing regions;
- educational and accessory guidance;
- non-vendor-specific representative media; and
- structured RFQ initiation.

Broad sourcing regions describe ALLRENTZ capability, not verified current vendor inventory.

### 9.3 Tier 2 — Active-customer discovery

An active customer with valid organization authority may see:

- normalized equipment types;
- supported sourcing regions;
- required document categories;
- typical logistical constraints;
- whether ALLRENTZ can initiate a sourcing review; and
- RFQ completeness state for authorized RFQs.

Safe sourcing indicators include:

- `Sourcing supported`;
- `Vendor confirmation required`;
- `Specialty sourcing required`; and
- `Regional sourcing review required`.

Lead-time bands require an authoritative source, capture timestamp, validity window, and safe confidence classification. They must never be represented as current supply without that evidence.

### 9.4 Tier 3 — RFQ-authorized information

Authorized RFQ participants may see only relationship- and state-permitted:

- responding vendor identity;
- vendor-submitted availability and offered quantity;
- delivery schedule;
- quote pricing and expiration;
- rental assumptions;
- freight, mobilization, accessories, and exclusions;
- commercial terms;
- approved evidence/document state; and
- role-appropriate comparison results.

Vendor-yard detail is disclosed only when necessary for delivery, pickup, inspection, logistics, or contractual evidence. RFQ participation alone does not reveal all source locations.

### 9.5 Tier 4 — Operations-only intelligence

Authorized ALLRENTZ operations may see scope-permitted:

- exact vendor yards;
- raw inventory feeds and quantities;
- source timestamps and internal confidence;
- vendor cost/source pricing;
- historical response and pricing behavior;
- performance and reliability;
- regional supply gaps;
- customer-specific terms; and
- internal qualification and risk notes.

Operations access remains subject to active principal state, effective platform authority, purpose, policy, and object scope.

### 9.6 MVP classification defaults

For the MVP:

- exact rental pricing is protected;
- negotiated pricing is protected;
- vendor cost/source pricing is operations-only;
- authorized quote pricing is visible only through its RFQ/quote relationship;
- authenticated status alone reveals no vendor-specific inventory;
- public projections use explicit safe-column allowlists;
- underlying equipment and vendor-inventory objects are protected; and
- every unresolved field defaults to protected.

Generic public price guidance, if ever desired, requires a separately approved derived-data contract and must not expose a vendor's current row-level pricing.

### 9.7 Required field matrix

Before implementation, the coverage matrix must classify every column of:

- `equipment`;
- `equipment_public`;
- vendor profile and qualification sources;
- availability and inventory;
- location;
- quantity;
- price and commercial terms;
- source and capture time;
- confidence and verification;
- vendor performance; and
- related views, RPCs, and frontend projections.

The current repository surface requires a separately authorized bounded equipment-exposure correction. Stage 2I does not alter equipment visibility.

Stage 2A cutover is blocked if the final surface matrix proves that vendor identity, exact inventory, available quantity, current availability, exact yard or facility location, rental pricing, negotiated terms, protected source/confidence information, or other protected equipment fields remain broadly visible outside the approved relationship. `security_invoker` behavior alone does not satisfy this gate.

That correction must either be completed and accepted as a separate predecessor tranche before Stage 2A Cutover, or enter a separately approved amendment to the exact Stage 2A file boundary after the field matrix identifies the required migrations, policies, views, RPCs, Edge Functions, service consumers, Realtime surfaces, and frontend projections. Discovery of protected exposure does not silently expand an authorized file set.

## 10. Decision 4 — Realtime containment

### 10.1 Approved rule

The tracked `smart_draft_quotes` Postgres Changes `UPDATE` subscription remains provisional.

Realtime is a freshness signal, never the authority source:

> **Realtime event → authoritative refetch → current backend authorization → role-appropriate UI**

A Realtime payload cannot finalize a quote, delivery, dispatch, on-rent, off-rent, pickup, invoice, or authority state.

### 10.2 Required local suspension test

The Stage 2A local acceptance suite uses synthetic principals and proves:

1. one active authorized principal establishes the subscription;
2. an authorized `UPDATE` event reaches an instrumented raw subscription callback;
3. the original JWT and socket remain connected;
4. the named `restrict_principal` Action moves the principal to `restricted`;
5. another authorized actor updates the governed object;
6. the restricted connection receives no protected event outside its remediation allowlist;
7. the sequence repeats through the named `suspend_principal` and `disable_principal` Actions and through natural active-access expiration;
8. token refresh does not restore event delivery;
9. disconnect and reconnect do not restore delivery;
10. backend reads and mutations remain denied;
11. raw callback count, channel state, payload classification, and backend refetch result are recorded independently of React behavior;
12. client query/session cache contents and rendered UI are inspected separately and contain no protected residual data; and
13. every synthetic fixture is removed and reconciled.

`pending_activation` uses a separate never-active principal. `active → pending_activation` is not tested because it is not a valid transition.

Direct fixture writes may prepare synthetic pre-enforcement state only. They cannot perform the authority transition under test because that would bypass the Action, version, audit, correlation, session, and cache contract.

### 10.3 Pass boundary

Backend containment is the security gate:

- no new protected event is delivered;
- protected reads and mutations deny;
- token refresh and reconnect cannot bypass current state; and
- RLS continues to require both principal access and the governing-object relationship.

Socket disconnect and client-cache clearing are required defense-in-depth and confidentiality controls. Previously copied, exported, or downloaded information cannot be recalled and remains classified residual exposure.

### 10.4 DELETE limitation

Protected confidentiality must not rely on raw Postgres Changes `DELETE` authorization. PostgreSQL cannot re-evaluate RLS against a deleted row.

Future protected deletion notifications use:

- a private server-controlled Broadcast; or
- an authorized tombstone/event object containing only approved information.

The tracked subscription listens to `UPDATE`; its exact containment remains subject to the local test.

### 10.5 Retain or contain

If the test passes:

- retain Postgres Changes;
- keep indexed principal and row-relationship RLS checks;
- disconnect on authority-state change where practicable;
- include authority version in safe snapshots; and
- refetch after reconnect.

If the test fails:

- remove the protected subscription from the Stage 2A release;
- use temporary authorized polling or an approved private Broadcast design;
- poll only while the principal and page remain eligible;
- cancel immediately on sign-out or non-active state;
- clear the query cache; and
- use configuration-controlled intervals, retry limits, backoff, visibility, and focus behavior.

Polling timing is an implementation default, not a permanent architecture rule.

## 11. Manifest and cutover concurrency

Before the final inventory snapshot, concurrent signup handling must already create:

- every legacy profile, persona-routing, and legacy customer/vendor `user_roles` row required by the current signup contract;
- exactly one shadow principal record classified `unclassified`;
- an `unverified` identity-assurance result;
- one `pending_activation` shadow access record; and
- no canonical or effective membership, platform-role grant, qualification, or operational grant.

Shadow signup behavior must be idempotent and transactional:

- the legacy writes and shadow writes execute in the same Auth-trigger transaction and all commit or all roll back;
- ordinary signup still completes with its current compatible legacy result;
- exact retry creates neither duplicates nor divergent state;
- duplicate or retried trigger execution resolves to exactly one principal registry record and one pending access record;
- an immutable-field conflict or incompatible retry fails closed rather than overwriting provenance;
- no canonical organization membership, platform role, qualification, or operational grant is created;
- customer/vendor legacy persona rows remain legacy compatibility data and never become `platform_role_grants`;
- existing users are not silently modified;
- anonymous identities remain non-operational;
- user metadata cannot classify a human or workload principal, create canonical authority, or select an effective access state;
- ordinary signup cannot create a workload principal;
- before the latch, the shadow `pending_activation` result changes no legacy authorization outcome; and
- pre-cutover RLS outcomes remain unchanged.

The controlled cutover runner begins one `SERIALIZABLE` database transaction before issuing any cutover query. That transaction acquires a transaction-scoped advisory lock, explicit row locks on the authority runtime-state and manifest-consumption records, and one documented deterministic lock order. The database cutover procedure verifies the expected isolation level rather than assuming that an RPC can change an already-started transaction. Every cooperating authority mutation must honor the same advisory-lock contract. Serialization or lock failure aborts the entire transaction and may enter only a bounded retry that reruns every verification against current state.

The inventory snapshot digest contract must version and define:

- included schemas, tables, rows, and columns;
- stable row and source ordering;
- null, Boolean, number, timestamp, UUID, text, and binary representations;
- Unicode and UTF-8 handling;
- excluded volatile or non-authoritative fields;
- canonical row and collection serialization;
- source counts and omission/duplication checks; and
- cross-implementation conformance vectors.

Two conforming implementations must produce identical canonical bytes and digests. A changed count, row, compatibility version, approver eligibility state, Edge deployment attestation, or runtime-state version invalidates the attempt.

The cutover transaction must:

1. acquire the approved transaction-scoped authority lock;
2. reconcile the complete principal universe;
3. verify snapshot digest and counts by source;
4. verify every pre-snapshot claim has one approved disposition;
5. verify every post-snapshot identity has a fail-closed pending record;
6. verify no active record exists outside the manifest;
7. verify manifest digest, environment, versions, expiration, nonce, and approvals;
8. capture `captured_at := clock_timestamp()` exactly once immediately before the authoritative eligibility and mutation decision;
9. re-evaluate approver and target eligibility;
10. apply only exact approved dispositions;
11. create only exact initialization grants;
12. create correlated authority events and obligations;
13. consume the database manifest marker;
14. set the one-way enforcement latch; and
15. commit all or nothing.

The signup trigger—not the advisory lock alone—closes the race with Auth writes.

On serialization failure, timeout, lock failure, expiration, digest mismatch, attestation mismatch, or any other exception:

- the enforcement latch remains unchanged;
- the manifest remains unconsumed unless the complete cutover committed atomically;
- no partial access state, role grant, event, or obligation becomes effective;
- the same manifest may be retried only while it remains unconsumed, unexpired, version-compatible, and unchanged;
- the retry uses a new transaction and revalidates every current condition; and
- an exhausted retry budget stops for controlled review rather than weakening isolation or validation.

Execution and verification are separate programs. The future `supabase/stage2a_cutover.ps1` executor:

- defaults to dry-run and requires one explicit execution flag for an authority-changing run;
- proves the exact target environment before accepting a manifest;
- binds the approved raw manifest bytes without text conversion;
- uses one transaction-capable database connection;
- begins `SERIALIZABLE` before issuing any cutover query;
- performs the complete lock, manifest, eligibility, mutation, event, obligation, consumption, and latch sequence through that single transaction;
- stops on every mismatch and prints no credential, protected manifest content, approval evidence, or sensitive reason; and
- never represents multiple independent REST, RPC, or shell database calls as one atomic transaction.

`supabase/stage2a_cutover_verify.ps1` is a separate postcondition verifier. It may not perform the authority-changing cutover or silently repair a failed result.

## 12. Time, version, idempotency, and correlation

### 12.1 Time

Every effective window uses:

> `[effective_at, expires_at)`

Database UTC is authoritative. After an Action acquires its required row and advisory locks, and immediately before authoritative eligibility and mutation checks, it captures:

```sql
captured_at := clock_timestamp();
```

The Action reuses that one value for authorization evaluation, effective-window checks, resulting state, authority events, obligations, and manifest consumption. It must not call `clock_timestamp()` repeatedly during one decision.

`now()` and `transaction_timestamp()` represent transaction start, while `statement_timestamp()` represents statement receipt. They must not substitute for the required post-lock decision instant.

- authority is valid at `effective_at`;
- authority is invalid exactly at `expires_at`;
- expiration is enforced on every protected request;
- a scheduler is not required for denial;
- no hidden grace period exists;
- review time creates an obligation but changes no authority;
- expiration never restores a previous state; and
- backdating is prohibited except through an explicit migration rule.

### 12.2 Versions

Principal access and other authority objects use monotonically increasing versions.

Protected mutations:

- require the expected object/authority version;
- re-read current database state;
- reject stale expectations deterministically; and
- never treat a client version as authority.

Safe frontend snapshots may carry authority versions for cache invalidation. The database remains controlling.

### 12.3 Idempotency

For an authority mutation:

> `(actor principal, Action type/version, idempotency key) → canonical request digest → stored result`

- same key and same digest returns the original result;
- same key with different parameters is rejected;
- one completed Action is not executed twice;
- concurrent compatible attempts produce one result;
- the result links to the original Action and authority event;
- pre-execution validation failures may be retried; and
- retention is explicit and appropriate to the authority event.

Stage 2 applies this contract to its authority Actions. It does not create a generalized idempotency platform for every future rental-lifecycle Action.

### 12.4 Correlation and causation

Each Action receives one correlation identifier. Derived events, obligations, receipts, and post-commit effects retain:

- the correlation identifier;
- the causative Action identifier; and
- the governing object identifiers.

Correlation never replaces authorization or object identity.

### 12.5 Failure and performance contract

Authority evaluation is fail-closed and operationally bounded:

- an evaluator error, timeout, malformed state, missing record, unsupported version, or ambiguous result denies the protected operation;
- no client, Edge Function, or server cache may continue granting authority after the authoritative version or eligibility state changes;
- current-state, grant, membership, relationship, and workflow checks use reviewed indexes and bounded query shapes;
- protected list operations avoid per-row or N+1 authority queries;
- query-plan, concurrency, timeout, and stale-cache regression evidence is required before cutover; and
- a performance incident may reduce availability but cannot activate a bypass, stale grant, legacy fallback, or client-side authority source.

Performance targets are established from measured implementation evidence. This specification does not invent an unevidenced latency number.

## 13. Deployment compatibility and one-way enforcement

### 13.1 Expand–contract sequence

The end-to-end deployment is not one atomic transaction.

Required order:

1. deploy and verify backward-compatible shadow schema;
2. deploy principal-aware database functions and dormant hooks;
3. deploy Edge Functions that understand pre- and post-cutover states;
4. deploy frontend access boundaries and safe non-active states;
5. verify minimum compatible versions;
6. prepare and approve the external manifest;
7. run the atomic database cutover;
8. run immediate local or separately authorized environment acceptance;
9. retain compatibility through a bounded observation period; and
10. remove legacy compatibility only through a later approved change.

Before the latch can be set, an Edge deployment-attestation hard stop requires:

- the principal-aware function and configuration deployed to the target environment;
- the approved build digest or strongest provider-supported immutable deployment identifier recorded;
- a behavioral canary proving a non-active principal cannot cause any service-authority operational read or mutation;
- principal access checked before the function performs a protected service-role read;
- consequential authorization repeated by the database Action;
- old caller behavior denied safely at the database; and
- any version, configuration, environment, canary, or attestation mismatch to stop cutover.

The evidence must prove the strongest behavior the platform exposes. It must not claim absolute global retirement of an old runtime instance when the provider supplies no evidence capable of proving that assertion.

### 13.2 Compatibility matrix

| Component | Before latch | After latch | Old version security result |
| --- | --- | --- | --- |
| Existing frontend | Existing behavior | May show stale/error UI | Backend must deny; client cannot grant |
| New frontend | Reads safe shadow/snapshot state | Enforces principal boundary and clears caches | Compatible |
| RFQ Edge Function | Existing checks plus dormant helper | Current principal check plus existing object checks | Database Action must still deny unsafe old callers |
| Controlled RPCs | Existing object checks plus dormant helper | Principal, grant, relationship, object, and state checks | Fail closed |
| RLS | Pre-cutover compatibility result | Current principal plus object relationship | Fail closed |
| Realtime | Current tracked behavior | Tested current-row authorization and containment | Retain only after pass |

The backend—not frontend version detection—is the security boundary.

### 13.3 Runtime states

The one-way authority runtime contract supports:

- `pre_cutover`;
- `normal_enforcement`; and
- `maintenance_deny_all`.

There is no `enforcement_off`.

After leaving `pre_cutover`, legacy authority cannot be reactivated.

`maintenance_deny_all`:

- denies all ordinary operational access, including administrator business operations;
- preserves only fixed runtime-state inspection, recovery-evidence submission, and the exact controlled recovery Action;
- cannot be entered or exited by an ordinary client;
- never revives legacy authority; and
- never changes an underlying principal, role, membership, grant, or object state merely by changing runtime mode.

Entry after cutover requires:

- one currently active and eligible human `platform_admin`;
- fresh policy-approved step-up or strong-factor evidence;
- the current expected runtime-state version;
- a reason and incident/correlation identifier;
- an idempotency key;
- rate-limit and replay protection;
- one atomic transition to `maintenance_deny_all`; and
- an immediate authority event;
- a mandatory high-priority recovery obligation with an owner and deadline;
- prominent visibility to every other eligible administrator; and
- immediate out-of-band notification when an approved delivery mechanism exists.

One administrator may enter the mode because the Action only removes ordinary authority.

If the required step-up or recovery mechanism is unavailable, entry remains non-invokable. Notification delivery is evidence and escalation, never authority and never a condition that can roll back an otherwise atomic entry.

Exit requires:

- a separate recovery request;
- approval by two distinct currently active and eligible human administrators;
- no requester self-approval;
- current expected runtime-state and policy versions;
- idempotency and concurrency protection;
- revalidation that the underlying enforcement latch remains active;
- one atomic transition to `normal_enforcement`; and
- an authority event recording both humans and the recovery basis.

If ordinary administrator quorum is unavailable, only the separately controlled external recovery process may authorize exit.

Stage 2I may model `maintenance_deny_all`, but it must not be invokable until entry, exit, insufficient-quorum recovery, version, idempotency, audit, and local disposable negative tests pass. No test or recovery path may create `enforcement_off`, `legacy_fallback`, or `temporary_bypass`.

The negative suite must prove that one administrator can neither approve their own exit nor exit the mode alone.

## 14. Complete protected-surface matrix

Before Stage 2A cutover, one bounded evidence pass must classify:

- tables and columns;
- `auth.users`, `auth.identities`, Auth hooks, and Auth-trigger paths;
- views and materialized views;
- sequences;
- schemas and schema privileges;
- direct grants and default privileges;
- RLS enablement and policies;
- table-owner and `BYPASSRLS` behavior;
- trigger functions;
- RPCs and all `SECURITY DEFINER` functions;
- function ownership, `search_path`, and execute grants;
- Edge Functions;
- Edge invocation configuration, JWT verification, and CORS;
- service-role consumers;
- environment variables, frontend-public variables, and build-time configuration;
- Realtime publications and subscriptions;
- Storage paths and signed/public URLs;
- background scripts, scheduled jobs, and webhooks;
- CI/CD, preview, deployment, migration, database-owner, and operational identities;
- backup, restore, replication, export, report, CSV, and document-download authority;
- analytics, telemetry, error-reporting, and logging sinks that may receive protected data;
- hardcoded identities and allowlists;
- frontend-only guards;
- browser/query caches; and
- external control-plane authority.

The same matrix must explicitly include the newly created authority infrastructure:

- Principal Registry;
- Principal Access Records;
- Principal Activation Cases;
- restrictions;
- remediation cases and submissions;
- authority obligations;
- authority events;
- idempotency records;
- manifest metadata and consumption records;
- authority runtime-state record;
- internal transition functions;
- safe authority-snapshot RPC;
- signup trigger; and
- manifest verification and cutover procedures.

`FORCE ROW LEVEL SECURITY` does not constrain a PostgreSQL role with `BYPASSRLS`. Service-role and definer paths require explicit initiating-principal checks.

Each surface records:

- schema and owner;
- object and operation;
- caller;
- direct and default privileges;
- RLS status;
- client, service, and internal Action access;
- safe read projection and sole controlled write path;
- current authority source;
- future authority source;
- tenant and relationship scope;
- service-role/definer behavior;
- pre-latch behavior;
- post-latch behavior;
- negative test;
- owner; and
- result.

Absence of a current Storage, workload, webhook, or scheduled-job path is recorded as an evidenced `none`, not omitted.

## 15. Stage 2I future implementation file boundary

Subject to separate implementation authorization, the proposed Stage 2I boundary is exactly these 17 files:

- `supabase/migrations/20260723120000_stage2i_principal_authority_shadow.sql`
- `supabase/migrations/20260723121000_stage2i_authority_compatibility_hooks.sql`
- `package.json`
- `package-lock.json`
- `supabase/stage2_authority_canonicalize.mjs`
- `supabase/fixtures/stage2_authority_manifest_vectors.json`
- `supabase/stage2_authority_inventory.ps1`
- `supabase/stage2_authority_manifest_verify.ps1`
- `supabase/stage2i_shadow_verify.ps1`
- `supabase/test_helpers/stage2_shadow_fixture_cleanup.ps1`
- `supabase/key_migration_verify.ps1`
- `supabase/profile_authority_verify.ps1`
- `supabase/membership_verify.ps1`
- `supabase/rfq_transition_verify.ps1`
- `supabase/b6_2_vendor_authority_verify.ps1`
- `supabase/b6_3_vqr_pending_review_verify.ps1`
- `supabase/vendor_quote_submission_verify.ps1`

No listed file is authorized by this implementation-planning specification.

`supabase/roles.sql` is not part of the boundary and must not be introduced as the Stage 2I owner-provisioning mechanism.

The migration names are provisional candidates derived from the current local migration order. Immediately before file creation, an authorized implementation preflight must re-check the exact branch, HEAD, complete migration ordering, and duplicate timestamp prefixes. Any required rename or additional migration reopens the exact boundary for review.

The shared helper owns only the new Stage 2 shadow-fixture registration, exact affected-table reconciliation, dependency-ordered shadow cleanup, and cleanup-only recovery primitives. It accepts no arbitrary table name or SQL, validates every identifier and loopback/container precondition, and is loaded from an exact `$PSScriptRoot`-relative path. The seven existing verification scripts retain their current test-specific fixture and cleanup implementations; they enter the boundary only to preserve their existing assertions while invoking the common shadow reconciliation. There is no broad harness rewrite.

`src/integrations/supabase/types.ts`, `supabase/config.toml`, Edge Functions, frontend files, existing migrations, untracked Gate 2 artifacts, `MASTER_PRIORITY_BOARD.md`, and intentionally excluded local artifacts are explicitly outside Stage 2I. The private schema is verified through catalog, privilege, function, trigger, and behavioral assertions—not browser-generated types. Generated types enter a later Stage 2A boundary only if an approved public safe-snapshot contract changes.

If `canonicalize@3.0.0` is rejected or another implementation is proposed, the package, tooling, vectors, and resulting file boundary must be reconsidered and approved before implementation.

Branch creation remains separately authorized. If the Stage 1 and documentation work has merged, Stage 2I branches from the then-current verified `main`. If implementation must begin before its parent documentation commit merges, it uses a clearly declared stacked local branch such as `stage2/principal-access-foundation` from the exact approved documentation commit. Neither path permits fetching, merging, rebasing, pushing, or creating a branch without its own authorization.

## 16. Stage 2A future implementation file boundary

Subject to separate authorization after Stage 2I acceptance, the proposed Stage 2A boundary is exactly:

- `supabase/migrations/<timestamp>_stage2a_principal_access_actions.sql`
- `supabase/migrations/<timestamp>_stage2a_principal_access_enforcement.sql`
- `supabase/functions/rfq-transition/index.ts`
- `src/App.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/Navigation.tsx`
- `src/pages/AuthPage.tsx`
- `src/components/PrincipalAccessBoundary.tsx`
- `src/pages/PrincipalAccessNotice.tsx`
- `src/lib/principalAccess.ts`
- `src/lib/principalAccess.test.ts`
- `src/integrations/supabase/types.ts`
- `supabase/principal_access_verify.ps1`
- `supabase/stage2a_cutover.ps1`
- `supabase/stage2a_cutover_verify.ps1`

`src/components/SmartDraftStatusTracker.tsx` enters the authorized boundary only if the controlled Realtime test requires a change.

Existing local authority scripts may enter a separately reviewed boundary only where they must seed an explicit active access state after enforcement. They are not automatically authorized.

The equipment-exposure correction is a separate predecessor boundary unless a later product-owner-approved amendment names its exact files. Stage 2A implementation authorization alone does not authorize equipment migrations, policies, projections, RPCs, Edge Functions, service consumers, Realtime changes, or frontend changes.

Stage 2A Cutover cannot begin until the equipment correction is accepted or the exact Stage 2A boundary has been formally amended and reviewed.

Explicitly excluded:

- package upgrades;
- unrelated cleanup;
- a generic workflow engine;
- an external authorization engine;
- a generalized vendor-qualification implementation;
- a public vendor-inventory marketplace;
- an outbox without a real consumer;
- a generic `set_user_status` RPC;
- a service-role Action that trusts arbitrary actor identifiers;
- `MASTER_PRIORITY_BOARD.md`; and
- intentionally excluded local artifacts.

## 17. Stage 2I acceptance

Stage 2I behavioral verification remains local and disposable. Hosted Preview verification is a separate, read-only catalog and control-plane evidence mode and never creates fixtures or calls a cleanup path. Fixture identity is never accepted from user-controlled profile, Auth metadata, or other authority-bearing application data, and no production cleanup RPC is created. The local harness uses exact known synthetic identifiers, one unique run correlation, and an out-of-band local fixture inventory after proving loopback/container targeting.

Each affected script must preserve its existing assertions and pass accounting while adding separately labeled shadow assertions. Pre-run orphan reconciliation, fixture creation, verification, cleanup, and cleanup-only recovery run through `try`/`finally` behavior. Cleanup uses an explicit dependency order and exact fixture identifiers. Unexpected rows, relationships, events, effective grants, memberships, qualifications, or non-fixture event linkage fail the run and preserve sanitized evidence for review. Success requires zero remaining synthetic state across every affected table, not only the primary fixture objects.

The execution evidence records the actual PostgreSQL version, Supabase CLI and local runtime versions, Docker image identifiers, Node version, PowerShell version, TypeScript version, and `supabase-js` version. The specification fixes compatibility requirements, not unevidenced patch versions. Immediately before future local runtime execution, the runbook must revalidate firewall/loopback containment and record the restoration procedure; the previously observed firewall-enforced state must not be misreported as process-level loopback binding.

Demo identities are non-human, non-operational, and ineligible for administrator initialization or approval quorum. If any browser-visible demo credential reaches protected non-simulated data, the run stops as an immediate containment blocker.

### 17.1 Separate CI-hardening prerequisite

Before the Stage 2I implementation PR may pass, a separately authorized, independently reviewed CI-hardening prerequisite must be completed and verified outside the exact 17-file Stage 2I implementation boundary. It must:

- pin every referenced GitHub Action to a reviewed full-length commit SHA;
- pin the Linux Node and npm toolchain to the exact approved versions and verify the npm artifact digest before execution;
- prohibit `npx` and any other remotely resolved package-command path;
- run the frozen Linux dependency replay, unit tests, TypeScript typecheck, lint, and production build against the exact PR head;
- machine-enforce the exact Stage 2I path allowlist for the authorized Stage 2I PR;
- record the Linux runner image metadata, operating system, architecture, Node, npm, Git, PowerShell where used, package and lockfile digests, dependency identity, and verification results; and
- run GitHub dependency review when the repository plan supports it, or require an equivalent recorded vulnerability and license review when it does not.

The prerequisite must be introduced and proven separately so a CI-control defect cannot be confused with an authority implementation defect. It must not add an application runtime dependency, production service, credential, signing key, or new authority source. Signed provenance, SBOM attestation, in-toto, Sigstore, offline artifact custody, and higher SLSA-level claims remain deferred until ALLRENTZ produces a governed release artifact or a separately approved risk decision requires them.

The CI-hardening prerequisite used its own separately authorized workflow boundary and was committed, pushed, and merged to `main` through PR #6 at `cb2cf1fff88df2231aa53a12060a82bc95457156`. That completed workflow change did not enter or silently expand the 17-file Stage 2I implementation boundary. Stage 2I implementation remains unauthorized and still requires its own exact-scope approval.

### 17.2 Exact dependency and clean-replay commands

The exact verified npm `10.9.8` CLI and common options from section 7.2 are used for every package operation. After the separately authorized repository mutation, frozen dependency replay and ordinary code verification use:

```powershell
$packageJsonBefore = (Get-FileHash -Algorithm SHA256 -LiteralPath '.\package.json').Hash
$packageLockBefore = (Get-FileHash -Algorithm SHA256 -LiteralPath '.\package-lock.json').Hash

& $nodeExe $npmCli ci @npmTreeOptions

if ((Get-FileHash -Algorithm SHA256 -LiteralPath '.\package.json').Hash -ne $packageJsonBefore) {
  throw 'npm ci changed package.json'
}
if ((Get-FileHash -Algorithm SHA256 -LiteralPath '.\package-lock.json').Hash -ne $packageLockBefore) {
  throw 'npm ci changed package-lock.json'
}

& $nodeExe $npmCli test
& '.\node_modules\.bin\tsc.cmd' --noEmit
& $nodeExe $npmCli run lint
& $nodeExe $npmCli run build
```

The future `supabase/stage2i_shadow_verify.ps1` must expose a fail-closed `CleanLocalReplay` mode. That mode creates a uniquely named disposable Supabase project outside the repository, assigns unique project, port, container, network, and volume identifiers, proves the target is local, applies the exact reviewed migrations, runs the complete local suite, reconciles all synthetic fixtures, removes only its own resources, and confirms the existing local stack was unchanged. The exact invocation contract is:

```powershell
$expectedHeadSha = '<approved-40-character-implementation-head-sha>'
$shadowMigrationSha256 = '<approved-shadow-migration-sha256>'
$hooksMigrationSha256 = '<approved-hooks-migration-sha256>'
if ($expectedHeadSha -notmatch '^[0-9a-f]{40}$') {
  throw 'Expected an exact 40-character implementation HEAD SHA.'
}
if ((git rev-parse HEAD).Trim() -ne $expectedHeadSha) {
  throw 'Local HEAD does not match the approved implementation SHA.'
}

powershell -NoProfile -ExecutionPolicy Bypass `
  -File '.\supabase\stage2i_shadow_verify.ps1' `
  -Mode CleanLocalReplay `
  -ExpectedRepositoryRoot (Resolve-Path '.').Path `
  -ExpectedHeadSha $expectedHeadSha `
  -ExpectedShadowMigrationSha256 $shadowMigrationSha256 `
  -ExpectedHooksMigrationSha256 $hooksMigrationSha256 `
  -ExpectedNpmTarballSha256 '3E68F9B5FCAF1A94BA0E37E6A565C920B2BE6BD98998C50970385D6A692AF780' `
  -ExpectedCanonicalizeTarballSha256 'F6C9B99A28B884A32053994735004ADD11474DDED38EC342414E53F7FB1E1F19'
```

The mode must stop before mutation if the branch, HEAD, migration digests, tool digests, loopback/container boundary, unique resource names, clean-replay file set, or cleanup inventory is missing or ambiguous. Failure must enter cleanup-only recovery and return nonzero; success requires fresh-session zero-residue reconciliation.

### 17.3 Exact hosted Preview verification commands

The same future verifier must expose a hard-separated `HostedPreviewCatalog` mode. It is read-only, accepts the database URL only through the named process environment variable, never prints that value, refuses a production project reference, creates no fixture, invokes no cleanup, and validates the exact Preview project, PR head SHA, migration digests, migration history, Pattern B ownership, managed membership graph, ACLs, default ACLs, function hardening, application-role denials, and absence of partial probe residue.

The required command contract, after a separate authorization has supplied the exact values through an approved secret channel, is:

```powershell
$repository = 'ALLRENTZ/allrentz-rev-1'
$pullRequest = '<approved-pr-number>'
$expectedPreviewProjectRef = '<approved-preview-project-ref>'
$expectedHeadSha = '<approved-40-character-pr-head-sha>'
$shadowMigrationSha256 = '<approved-shadow-migration-sha256>'
$hooksMigrationSha256 = '<approved-hooks-migration-sha256>'

$pr = & 'C:\Program Files\GitHub CLI\gh.exe' pr view $pullRequest `
  --repo $repository `
  --json headRefOid,state,isDraft,url | ConvertFrom-Json
if ($pr.state -ne 'OPEN') {
  throw 'Preview PR is not open.'
}
if ($pr.headRefOid -ne $expectedHeadSha) {
  throw 'Preview PR head does not match the approved implementation SHA.'
}

& 'C:\Program Files\GitHub CLI\gh.exe' pr checks $pullRequest `
  --repo $repository `
  --watch `
  --interval 10
if ($LASTEXITCODE -ne 0) {
  throw 'Hosted checks did not pass.'
}

powershell -NoProfile -ExecutionPolicy Bypass `
  -File '.\supabase\stage2i_shadow_verify.ps1' `
  -Mode HostedPreviewCatalog `
  -DatabaseUrlEnvironmentVariable 'STAGE2I_PREVIEW_DATABASE_URL' `
  -ExpectedProjectRef $expectedPreviewProjectRef `
  -ExpectedHeadSha $expectedHeadSha `
  -ExpectedShadowMigrationSha256 $shadowMigrationSha256 `
  -ExpectedHooksMigrationSha256 $hooksMigrationSha256
```

`STAGE2I_PREVIEW_DATABASE_URL` must already exist in the process environment and must never be echoed, interpolated into a logged command, persisted, or passed as a command-line value. The verifier must reject a missing URL, an unapproved host or project reference, the known production project reference, a non-Preview environment, a head or migration mismatch, unexpected executor or grantor behavior, any effective application-role authority, any write requirement, or incomplete fresh-session reconciliation. Passing this command does not authorize merge, deployment, or production access.

The Linux CI dependency replay and hosted Supabase Preview database verification are separate mandatory gates; neither substitutes for the other. The CI record must capture the exact operating system, architecture, Node version, npm version, npm tarball digest, dependency-tree-affecting options, `npm ci` result, installed `canonicalize` version and integrity, and before/after `package.json` and `package-lock.json` digests. It must use the same verified npm `10.9.8` tarball and frozen option contract, fail on any manifest or lockfile mutation, and run against the exact PR head SHA. A Linux result is not inferred from the verified Windows disposable run.

Stage 2I passes only when:

- signup still works;
- legacy signup outputs remain compatible while new signup atomically creates exactly one `unclassified` principal, one `unverified` assurance result, and one shadow `pending_activation` record;
- duplicate or retried signup-trigger execution is idempotent;
- signup-trigger failure rolls back both legacy and shadow writes;
- signup creates no canonical membership, effective platform role, qualification, or operational grant;
- metadata cannot classify a principal or create canonical authority;
- existing users are not silently modified;
- anonymous signup remains non-operational;
- ordinary signup cannot create a workload principal;
- pre-cutover RLS outcomes remain unchanged;
- no current effective authority changes;
- no effective canonical `platform_role_grants` row exists before cutover;
- the final platform-grant schema derives effectiveness from current state and retains history through Authority Events;
- Auth identity deletion preserves authority history and clears only the live Auth reference;
- shadow objects are inaccessible to ordinary clients;
- `authority_private` is not exposed through the Data API and its owner, direct grants, default privileges, function execution, and `search_path` assertions pass for every relevant role;
- `service_role` has no direct private-table authority and controlled functions cannot trust a supplied actor identifier;
- existing local workflows remain unchanged;
- no role, membership, or operational grant is created;
- manifest validation fails closed on wrong environment, digest, count, version, expiration, approval, nonce, or replay;
- BUILD and VERIFY modes operate on the same canonical bytes and the approved pinned dependency;
- canonicalization conformance vectors pass through Node, the PowerShell byte-preserving orchestrator, and the database verifier;
- byte-order marks, trailing newlines, invalid UTF-8 or Unicode, duplicate properties, unsupported or unsafe numbers, negative zero, non-canonical bytes, and digest disagreement fail closed;
- inventory covers the complete protected surface;
- catalog assertions match the committed private schema without exposing it in browser-generated types;
- every affected script retains its prior assertions and adds the required shadow assertions;
- synthetic fixtures and every correlated dependent record are fully reconciled and removed;
- shadow lookup query plans, signup concurrency, and timeout behavior meet the fail-closed and pre-cutover compatibility contract;
- existing test, typecheck, lint, build, and authorized local runtime suites pass; and
- the exact Stage 2I file diff contains no unrelated file.

Stage 2I acceptance authorizes neither Stage 2A nor production cutover.

## 18. Stage 2A acceptance

Stage 2A passes only when:

- every principal claim is reconciled exactly once;
- unclassified, missing, ambiguous, expired, or unsupported authority fails closed;
- only the approved initialization administrators are effective;
- previously valid JWTs cannot perform protected reads or mutations after authority loss;
- direct REST, RLS, RPC, Edge Function, and service-role paths agree;
- the approved Edge deployment attestation and denied-principal behavioral canary pass before latch activation;
- no Edge service-authority read occurs before current principal-access authorization;
- activation never implies membership;
- membership never implies transactional authority;
- restricted access exposes only case-specific remediation;
- remediation submission never restores authority;
- suspension and expiration deny without scheduler or logout dependency;
- disabled re-onboarding restores nothing implicitly;
- authority mutations are versioned, idempotent, atomic, and audited;
- maintenance deny-all cannot restore legacy authority;
- maintenance deny-all requires step-up evidence, creates the required event and obligation, and cannot be exited by one administrator;
- the Realtime test reaches an evidence-based retain or contain decision;
- the Realtime test records raw callback delivery separately from cache and UI behavior and uses named authority Actions;
- previously issued token containment, cache invalidation after authority loss, non-active route handling, and frontend stale-state behavior pass across every protected client path;
- browser cache clearing and residual exposure are classified;
- every field classified as protected equipment data is no longer broadly visible outside its approved relationship through any table, view, RPC, Edge Function, service-role, Realtime, or frontend path under a separately authorized correction;
- manifest application and database consumption are atomic;
- external receipt failure produces an obligation without changing authority;
- post-cutover reconciliation exactly matches the approved manifest;
- every synthetic fixture is removed;
- all existing and new verification passes; and
- the exact Stage 2A diff contains no unrelated file.

Durable session-revocation propagation, notification delivery, SIEM export, external receipt automation, and escalation processing may remain separately deferred only when:

- backend enforcement already denies correctly;
- the residual is explicitly recorded;
- an owner and deadline exist;
- no deferred mechanism is represented as an authority source; and
- Stage 2A is not described as providing immediate recall of already delivered information.

## 19. Evidence gates and product-owner checkpoints

The four decisions are recorded now, but operational evidence is required at different gates:

| Control | Policy recorded | Operational proof required before |
| --- | ---: | --- |
| Manifest custody contract | Yes | Stage 2A production manifest preparation |
| Exact canonicalization dependency | `canonicalize@3.0.0` approved only as an exact Stage 2I development dependency; exact registry URL, SRI, and tarball SHA-256 pinned; disposable npm `10.9.8` no-churn mutation verified; not applied | Stage 2I package or tooling change |
| Private-schema ownership pattern | Pattern B direct final-owner creation approved; local comparison and disposable `roles.sql` evidence passed; no ownership transfers | Exact Stage 2I migration review and hosted Preview |
| Managed creator relationship | PostgreSQL/Supabase automatic control-plane edge accepted locally only when its complete attributes match the approved contract | Hosted Preview must discover and validate the actual grantor and options |
| Stage 2I `roles.sql` mechanism | Rejected for this owner-provisioning use; no `roles.sql` is planned | Any future proposal to use `roles.sql` |
| Owner establishment | Closed-world create-or-exact-validate algorithm and fail-closed race handling specified | Exact Stage 2I migration review and hosted Preview |
| Owner global default ACL | Global `PUBLIC EXECUTE` removal required before function creation, plus per-signature revocation | Exact Stage 2I migration review and hosted Preview |
| Temporary migration membership | Transactional `ADMIN FALSE`, `SET TRUE`, `INHERIT FALSE`; exact-grantor removal before commit | Exact Stage 2I migration review and hosted Preview |
| Control-plane identity boundary | Trusted administration sessions and untrusted application/workload identities defined; current provider controls not overclaimed | Hosted Preview and separately approved operational control evidence |
| Exact migration filenames and ordering | Collision-free at original local commit `c4f382bfdc6168345c7ca1dda6298e4e83435275`, published byte-identically at `272dc9c40f0d485e1da1965a96b87083772b8b1a`; recheck required | Stage 2I migration creation |
| Shared shadow-fixture helper | Included in proposed boundary | Stage 2I script creation |
| Local firewall/loopback containment and rollback | Prior evidence only | Every authorized local runtime pass |
| Actual governance/approval providers, vault, custodians, and approver identities | No | Stage 2A cutover |
| Administrator initialization rule | Yes | Stage 2I specification acceptance |
| Named eligible administrators | No | Stage 2A cutover |
| Equipment classification | Yes | Any equipment projection correction |
| Realtime decision rule | Yes | Stage 2A Expand acceptance |
| Final Realtime retain/contain outcome | No | Stage 2A acceptance |
| Optional WORM hardening | Deferred | Separately approved governance hardening |

No further broad research cycle is required for this approved planning baseline. The canonicalization dependency decision, ownership feasibility, vendor setup, human eligibility, repository diff review, local runtime evidence, and any hosted inventory remain bounded execution gates—not assumptions.

## 20. Non-normative primary references

These sources validate external behavior. They do not delegate ALLRENTZ product decisions:

- [1Password Business overview](https://support.1password.com/explore/business/)
- [1Password vault-permission enforcement](https://support.1password.com/permission-enforcement/)
- [1Password Business audit log](https://support.1password.com/activity-log/)
- [1Password Business security practices](https://support.1password.com/business-security-practices/)
- [Amazon S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Realtime authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Supabase sign-out behavior](https://supabase.com/docs/guides/auth/signout)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase custom roles](https://supabase.com/docs/guides/database/postgres/custom-roles)
- [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL role attributes](https://www.postgresql.org/docs/current/role-attributes.html)
- [PostgreSQL role membership](https://www.postgresql.org/docs/current/role-membership.html)
- [PostgreSQL `GRANT`](https://www.postgresql.org/docs/current/sql-grant.html)
- [PostgreSQL `REVOKE`](https://www.postgresql.org/docs/current/sql-revoke.html)
- [PostgreSQL default privileges](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html)
- [PostgreSQL `pg_auth_members`](https://www.postgresql.org/docs/current/catalog-pg-auth-members.html)
- [PostgreSQL `pg_default_acl`](https://www.postgresql.org/docs/current/catalog-pg-default-acl.html)
- [PostgreSQL date/time functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Google Zanzibar](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)

## 21. Current decision status and final classification

| Item | Status |
| --- | --- |
| `ALLRENTZ-AUTH-001` architecture | **RATIFIED v1.0** |
| Controlled-docs model | **APPROVED; GOVERNANCE CORRECTIONS INCORPORATED** |
| Stage 2I/2A architecture direction | **APPROVED** |
| Four policy decisions in this document | **INCORPORATED; OPERATIONAL PROVIDERS AND NAMED PEOPLE PENDING** |
| `ALLRENTZ-AUTH-002` revision `0.2` | **APPROVED AT ORIGINAL LOCAL COMMIT `c4f382bfdc6168345c7ca1dda6298e4e83435275`; PUBLISHED BYTE-IDENTICALLY AT `272dc9c40f0d485e1da1965a96b87083772b8b1a`** |
| `ALLRENTZ-AUTH-002` revision `0.3` | **APPROVED CORRECTED IMPLEMENTATION-PLANNING BASELINE** |
| `ALLRENTZ-AUTH-002` revision `0.4` | **SUPERSEDED BY REVISION 0.5; PRESERVED AT ORIGINAL LOCAL COMMIT `848952fc5c97127e72e72f7abd5bd360c81cf806`; PUBLISHED BYTE-IDENTICALLY AT `3c18646d00325d5897e1074b7773fd627ba1eb55`** |
| `ALLRENTZ-AUTH-002` revision `0.5` | **SUPERSEDED BY REVISION 0.6; PRESERVED AT ORIGINAL LOCAL COMMIT `65b6772b4a5e4638b31dedcd42b4eee1cfe1d651`; PUBLISHED BYTE-IDENTICALLY AT `8deefce1b6991bca606f2627e3bdd2e36df65093`** |
| `ALLRENTZ-AUTH-002` revision `0.6` | **CURRENT APPROVED IMPLEMENTATION-PLANNING BASELINE WITH NON-NORMATIVE PUBLICATION ERRATUM `ALLRENTZ-PR8-DOC-ERRATUM-001`; DEPENDENCY/TOOLCHAIN EVIDENCE AND EXACT REPLAY COMMANDS RECORDED; SEPARATE CI-HARDENING PREREQUISITE COMPLETED THROUGH PR #6** |
| Canonicalization dependency | **`canonicalize@3.0.0` APPROVED AS AN EXACT STAGE 2I `devDependency`; NOT YET APPLIED** |
| Lockfile generator | **npm `10.9.8` APPROVED FOR THIS MUTATION ONLY; SOURCE, SRI, TAR/CLI DIGESTS, TREE OPTIONS, AND DISPOSABLE NO-CHURN PROCEDURE VERIFIED** |
| Local PostgreSQL ownership capability | **PATTERN B LOCALLY VERIFIED ON POSTGRESQL `17.6`; NOT INDEPENDENTLY OR HOSTED-PREVIEW VERIFIED** |
| Managed automatic creator relationship | **ACCEPTED AS A DATABASE CONTROL-PLANE INVARIANT; LOCAL GRANTOR/OPTIONS VERIFIED; HOSTED CONTRACT PENDING** |
| Stage 2I `roles.sql` owner provisioning | **REJECTED; NO `roles.sql` MECHANISM PLANNED** |
| Database-level owner `CREATE` privilege | **PROHIBITED AND NOT REQUIRED BY PATTERN B** |
| Ownership transfers | **PROHIBITED AND NOT REQUIRED BY PATTERN B** |
| Separate CI-hardening prerequisite | **COMMITTED, PUSHED, AND MERGED TO `main` THROUGH PR #6 AT `cb2cf1fff88df2231aa53a12060a82bc95457156`** |
| Hosted Supabase Preview gate | **REQUIRED BEFORE MERGE; NOT YET AUTHORIZED OR EXECUTED** |
| Current approved planning baseline | **REVISION 0.6 WITH NON-NORMATIVE PUBLICATION ERRATUM `ALLRENTZ-PR8-DOC-ERRATUM-001`; REVISION 0.5 PRESERVED AT ORIGINAL LOCAL COMMIT `65B6772B4A5E4638B31DEDCD42B4EEE1CFE1D651` AND PUBLISHED BYTE-IDENTICALLY AT `8DEEFCE1B6991BCA606F2627E3BDD2E36DF65093`** |
| Stage 2I implementation | **NOT AUTHORIZED** |
| Stage 2A implementation | **NOT AUTHORIZED** |
| Governance-vault creation | **NOT AUTHORIZED** |
| Further local or hosted Supabase execution | **NOT AUTHORIZED** |
| Stage 2I branch, commit, push, PR, merge, or deployment | **NOT AUTHORIZED** |

The revision `0.6` approval and documentation-only commit authorization permits only the approved planning-baseline changes in:

- `docs/README.md`; and
- `docs/engineering/stage-2i-stage-2a-principal-authority-implementation-specification.md`.

Revision `0.5` was approved from candidate SHA-256 `598ABA1AB5D33AF44A994A89B042C092AC88B7CECB33377610FFBB4F007742C9` and is superseded but preserved at original local commit `65b6772b4a5e4638b31dedcd42b4eee1cfe1d651`, published byte-identically at `8deefce1b6991bca606f2627e3bdd2e36df65093`. Revision `0.4` remains preserved at original local commit `848952fc5c97127e72e72f7abd5bd360c81cf806`, published byte-identically at `3c18646d00325d5897e1074b7773fd627ba1eb55`.

The original revision `0.6` documentation authorization ended after the complete two-file diff, scoped whitespace validation, individual file hashes, combined approved-document hash, excluded-artifact preservation check, exact staging review, and one local documentation-only commit; it did not itself authorize amendment, push, PR, merge, deployment, Preview access, production access, package or lockfile mutation, or Stage 2I implementation. Subsequent separately granted authorizations published the documentation in PR #8 and completed the CI-hardening prerequisite through merged PR #6. Publication erratum `ALLRENTZ-PR8-DOC-ERRATUM-001` corrects only that publication provenance and current CI-prerequisite status. It does not authorize dependency installation, Stage 2I or Stage 2A implementation, merge, deployment, Preview access, remote Supabase access, or production access. Every implementation tranche still requires separate exact-scope authorization.
