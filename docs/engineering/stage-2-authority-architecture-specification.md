---
title: ALLRENTZ Stage 2 Authority Architecture Specification
domain: engineering
specification_id: ALLRENTZ-AUTH-001
revision: 1.0
status: ratified — bounded inventory and implementation planning only; implementation separately authorized
decision_status: Decisions 1–7 product-owner approved
validation_status: bounded candidate review and principal-class targeted re-review passed
ratified_on: 2026-07-22
ratified_by: ALLRENTZ Product Owner
supersedes: none — first controlled accepted baseline
authority: subordinate to /ALLRENTZ_CONSTITUTION.md and docs/doctrine/ALLRENTZ_ARCHITECTURAL_FOUNDATION.md
related: docs/doctrine/ALLRENTZ_ARCHITECTURAL_FOUNDATION.md, docs/engineering/authority-first-loop.md
last_reviewed: 2026-07-22
---

# ALLRENTZ Stage 2 Authority Architecture Specification

## Decision and boundary

This document defines the ratified Stage 2 contract for:

1. authoritative principal-access semantics;
2. formal separation of profile persona, platform authority, and organization authority; and
3. atomic, audited platform-role grant and revoke Actions.

This is an architecture specification, not implementation authorization. It does not authorize schema, migration, RLS, Edge Function, frontend, deployment, production, or remote-system changes. Each implementation stage below requires separate approval after its contract and test matrix are accepted.

Stage 1 containment remains complete but deliberately limited. Commit `35cae877704d0beb013fc54a77d160e5a4173075` removed direct client writes to `profiles` and `user_roles`, retained authenticated self-read, made `profiles.role_type` and `profiles.status` non-null, and added negative runtime verification. Stage 1 did not make profile status authoritative and did not formally separate the three role concepts.

The controlling implementation boundary is therefore:

> Stage 1 contained unsafe mutation paths. The ratified Stage 2 architecture must be converted into separately approved, bounded implementation stages before those paths are replaced.

## Baseline status and normative convention

| Control | Current value |
| --- | --- |
| Specification ID | `ALLRENTZ-AUTH-001` |
| Ratified revision | `1.0` |
| Product decisions | Decisions 1–7 approved by the product owner |
| Internal coherence | Passed at specification level through the matrix in this specification |
| External technical validation | Material clarifications incorporated; bounded candidate and targeted principal-class reviews passed |
| Final ratification | Approved by the ALLRENTZ Product Owner on 2026-07-22 |
| Supersession | None; this is the first controlled accepted baseline. Candidate and conversational drafts were not accepted baselines. |

The words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** express normative requirements when capitalized. Requirements stated in tables and invariants are also normative even when sentence case is used. Rationale, examples, industry comparisons, research references, candidate names, and implementation notes are non-normative unless explicitly labeled otherwise.

Logical object and Action names define required behavior, not final SQL identifiers, function names, transport choices, or file boundaries. Those implementation details remain deferred to an approved implementation plan. If explanatory text conflicts with an invariant, evaluation order, or approved decision, the invariant and approved decision control and the conflict requires a documented amendment.

## Controlling doctrine

Every Stage 2 decision must remain traceable through:

> **Object → Authorized Action → State Change → Audit Event → Next Step**

The authority-specific form is:

> **Authenticated principal → Current access state → Scoped grant → Authorized Action → Atomic authority change → Authority audit event → Effective enforcement**

### Formal invariant register

The following invariants are non-negotiable and apply across every Stage 2 decision and implementation stage.

| ID | Invariant |
| --- | --- |
| `INV-01` | Authentication proves identity and MUST NOT independently create operational authority. |
| `INV-02` | A globally ineligible principal MUST NOT exercise operational grants; only the exact activation, remediation, notice, or controlled recovery exception defined for that state may remain. |
| `INV-03` | Every applicable explicit denial or restriction MUST outrank an otherwise valid grant. |
| `INV-04` | Profile fields, frontend state, JWT convenience claims, caches, projections, AI output, and service credentials MUST NOT be final sources of human operational authority. |
| `INV-05` | Every consequential request MUST evaluate the exact Action, object, relationship, canonical state, scope, evidence, policy, and authoritative time. |
| `INV-06` | Consequential authority or workflow changes MUST use a controlled backend Action; direct uncontrolled client table writes MUST NOT create or alter authority. |
| `INV-07` | No person may approve their own `platform_admin` grant, permanent revocation, restoration, scope change, or equivalent high-authority change. |
| `INV-08` | Time MAY enforce only a previously approved authority window and MUST NOT invent, broaden, renew, or restore authority. |
| `INV-09` | Restoring a principal MUST NOT silently restore any separately suspended, revoked, expired, or otherwise ineffective privileged grant, membership, credential, session, or scoped authority. |
| `INV-10` | Suspension and expiration MUST remain authoritative even when session invalidation, cache eviction, scheduler execution, notification, or downstream delivery is delayed. |
| `INV-11` | Every successful authority mutation MUST produce its required immutable domain audit event in the same atomic result; technical logs do not substitute for that event. |
| `INV-12` | Failure of notifications, integrations, outbox delivery, or other post-commit effects MUST NOT change the authority decision or partially apply the mutation. |
| `INV-13` | A service-role or security-definer execution context MUST NOT bypass authorization of the initiating principal, acting organization, target, scope, and current state. |
| `INV-14` | Previously delivered data and bearer artifacts cannot always be revoked immediately; residual exposure MUST be bounded, classified, disclosed, and excluded from claims of immediate revocation. |
| `INV-15` | Bootstrap, migration, disaster recovery, and privileged restoration MUST fail closed on ambiguous environment, identity, provenance, manifest, policy version, consumption state, or quorum. |
| `INV-16` | Human platform roles MAY be held or exercised only by currently eligible human principals. Workload principals MUST NOT hold human platform roles, approve or administer human authority, satisfy human independence or quorum, elevate or independently delegate authority, or provide an alternate authority path for AI or automation. |

## Terminology

The generic term `account` is prohibited in authoritative rules unless the exact object is named. It may refer to a person, organization, commercial relationship, facility authorization, or provider billing account, which have different owners and consequences.

| Term | Meaning | Authoritative source |
| --- | --- | --- |
| Identity | The human or service identity that authenticated | Supabase Auth identity |
| Principal | An authenticated identity evaluated through one authoritative principal record | Identity plus application authority records |
| Human principal | A principal representing one individually attributable human being | Backend-controlled principal classification established through an approved identity process |
| Workload principal | A named non-human principal used by a service, integration, automation, scheduled job, or AI-assisted process | Backend-controlled principal classification plus a separately governed workload grant |
| Platform-role eligibility | Whether a human principal currently satisfies the identity assurance, individual-control, strong-factor, access-state, and policy requirements for a human platform role | Current backend evaluation; separate from principal kind and from the role grant |
| Principal access state | Whether the principal may currently use ALLRENTZ and at what access level | Dedicated access-state record; never `profiles.status` |
| Profile | Descriptive person data and non-authoritative interface preference | `profiles` or its successor |
| Persona/default portal | Preferred customer, vendor, or operations interface | Profile preference; never an authority grant |
| Platform role | Narrow global ALLRENTZ operational authority such as platform administrator or operations manager | Active platform-role grant |
| Organization membership | A person's role within one specific organization | `organization_memberships` or its successor |
| Organization type | The business capabilities of an organization, such as customer, vendor, or both | Organization record; not a user role |
| Scoped authority grant | Permission for a principal to attempt a named Action within an explicit scope and time window | Versioned grant record |
| Eligibility | Whether current state, relationships, evidence, and policy allow a specific action now | Backend Action evaluation |

### Principal classification and workload boundary

Principal kind and platform-role eligibility are separate facts. `human_principal` means the identity represents one individually attributable person. It does not mean that person is currently active, strongly authenticated, eligible for a platform role, or authorized for any Action. `workload_principal` means the identity represents non-human execution even when a human owns or initiates its work.

Principal kind is authoritative identity information established through a controlled backend identity process. It MUST NOT be created or changed through frontend state, profile data, a generic profile update, user self-selection, editable authentication metadata, an email or naming convention, a role label, or AI-generated classification. A generic field such as `profiles.principal_type` can never establish eligibility.

Principal kind is immutable after controlled creation. A classification error or genuine identity-model change requires disabling or superseding the incorrect principal, creating the correctly classified principal through the approved process, independently re-evaluating every grant, and recording the correction and provenance. No grant, membership, approval, session, or authority transfers automatically between the principals.

A human principal is platform-role eligible only while the approved backend evaluation confirms individual identity, non-shared control, required strong-factor enrollment, current principal access, policy compliance, and every role-specific condition. Loss of eligibility does not change the principal into a workload principal; it makes any human platform-role grant ineffective until a separately authorized revalidation or restoration Action succeeds.

AI is not an independent principal class or authority holder. AI-assisted execution uses a named workload principal owned by an accountable human and organization, or a specifically approved human-delegated Action that records both the initiating human and executing workload. Delegated execution is limited to the intersection of the human's current authority, the workload's current grant, object state, policy, and evidence. AI output remains non-authoritative until an approved backend Action validates and commits the result.

Every workload grant must identify:

- the named workload principal and purpose;
- the owning organization, a current accountable human owner, and a backup or incident owner;
- the exact environment, permitted Action types, organization/object scope, and data boundary;
- effective, expiration, and review times;
- credential issuance, rotation, containment, and revocation requirements without storing credentials in the grant or audit record;
- audit, correlation, rate/volume where required, and incident-response requirements; and
- the controlled Action that may revoke, replace, or amend the grant.

Workload grants MUST NOT use broad human or administrative labels such as `admin`, `manager`, `system_admin`, or `full_access`. A workload principal cannot use interactive human login, receive a human platform role, approve or administer human authority, satisfy dual approval or human independence, count toward administrator quorum, elevate itself, or independently delegate or broaden its authority. Any future service-to-service delegation requires a separately approved, explicit delegation chain that preserves the original initiator and never exceeds the intersection of all participating grants.

## Separation of status domains

No single status field may represent all organizational and transaction concepts.

| Status domain | Object or relationship | Examples of meaning | Stage 2 implementation scope |
| --- | --- | --- | --- |
| Principal access | Person/service principal | Active, restricted, suspended | Yes: Stage 2A |
| Identity verification | Person or organization verification record | Unverified, under review, verified, rejected, expired | No: contract boundary only |
| Organization lifecycle | Organization | Active, restricted, suspended, archived | No: future separately reviewed work |
| Commercial readiness | Relationship between contracting organizations | In review, conditional, approved, expired, revoked | No |
| Facility authorization | Organization/person-to-facility relationship | Pending, authorized, limited, expired, revoked | No |
| RFQ participation | RFQ invitation/participation | Eligible, invited, declined, submitted, removed, expired | Existing MVP objects continue |
| Sales opportunity | Separate CRM object | Discovery, qualified, active RFQ, awarded, lost | No; not authority |
| Rental execution | RFQ/order/asset/movement/rental-period objects | Object-specific operational state | No expansion in Stage 2 |

A displayed summary such as `Ready to Transact` may exist only as a derived read model. It may not become an authoritative status or bypass the underlying records.

## Principal access-state contract

### Canonical object

The authoritative object is a logical **Principal Access Record** linked one-to-one with a principal identity. The final SQL name is intentionally deferred until implementation design confirms naming and compatibility.

Minimum required properties:

- principal/user ID;
- canonical access state;
- state version for optimistic concurrency;
- effective timestamp;
- optional review/expiry timestamp;
- reason code and non-sensitive reason text;
- initiating authority Action and correlation ID;
- actor who applied the current state;
- created and updated timestamps.

`profiles.status` remains a legacy, non-authoritative field until an approved forward migration removes or clearly deprecates it. No backend authorization decision may read `profiles.status` after Stage 2A begins.

### Proposed states

| State | Meaning | New/refresh sessions | Self-service surface | Domain reads | Operational Actions |
| --- | --- | --- | --- | --- | --- |
| `pending_activation` | Identity exists but activation requirements are incomplete | Allowed only if the approved onboarding design requires it | Activation/remediation and sign-out only | Denied | Denied |
| `active` | Principal may be evaluated normally against roles, memberships, object state, and evidence | Allowed | Allowed according to grants | Allowed according to RLS/grants | Allowed according to full Action evaluation |
| `restricted` | Temporary containment that permits only explicitly allowlisted remediation | Allowed only for remediation | Own access state, remediation, sign-out | Denied except explicitly approved remediation data | Denied |
| `suspended` | Temporary administrative/security stop | Denied | Own access-state notice and sign-out only, if safely supportable | Denied | Denied |
| `disabled` | Indefinite administrative closure requiring explicit restoration | Denied | Sign-out only | Denied | Denied |

Only `active` permits operational Action evaluation. Every other state fails closed before role, membership, ownership, invitation, or workflow checks are considered.

**Decision 1 — approved:** New authenticated users default to `pending_activation`. This state means that identity exists but operational participation authority has not yet been established. It is not an email-verification, organization, compliance, commercial-readiness, suspension, or workflow status.

Activation requires a basis-specific backend Action, such as accepting a valid organization invitation, approved ALLRENTZ operations activation, or controlled first-owner setup. Invitation-based activation must atomically validate and consume the invitation, establish the scoped membership, update principal access, and record correlated audit events. No generic activation endpoint may accept arbitrary evidence or manufacture an authority basis.

Activation is necessary but not sufficient for operational access. Every subsequent Action still requires current principal access, valid platform or organization authority, object relationship, evidence, and permitted workflow state. Ending a membership removes that membership's authority but does not return an already activated principal to `pending_activation`.

Existing principals may be backfilled to `active` only through evidence-based inventory of legitimate organization participation, verified platform authority, controlled service identity, or another approved basis. Email verification alone is insufficient. Unknown or ambiguous records remain pending or enter controlled remediation.

### Scoped restrictions and remediation cases

`restricted` in the Principal Access Record is reserved for a principal-wide identity or platform-access integrity issue. Organization, facility, project, grant, compliance, and Action-specific problems use separate scoped restriction records while the principal may remain globally `active`.

Explicit denial outranks an allow grant. Every restriction identifies its exact scope, effective time, imposing authority, safe user reason, separate internal reason, required remediation, evidence requirements, reviewer, escalation path, and allowed resolution states.

A restriction owns a separate remediation case. Remediation case states such as `required`, `submitted`, `under_review`, `approved`, and `rejected` are not principal-access states. Restricted principals may access only the safe reason, assigned remediation requirements, their own remediation submissions and review status, narrowly approved credential or identity correction, support, and sign-out. Submission never restores access. Restoration or scoped-restriction removal requires a separate backend-authorized and audited Action.

### Allowed transitions

All state changes use an approved named backend Action. Activation uses basis-specific Actions. Administrative restriction, suspension, restoration, disabling, and reactivation use the controlled principal-access Action family. Direct table writes are prohibited.

| Source | Permitted target states |
| --- | --- |
| `pending_activation` | `active`, `restricted`, `suspended`, `disabled` |
| `active` | `restricted`, `suspended`, `disabled` |
| `restricted` | `active`, `suspended`, `disabled` |
| `suspended` | `active`, `restricted`, `disabled` |
| `disabled` | `active` through explicitly elevated restoration only |

Same-state requests must be idempotent or rejected with a deterministic reason code. A review or expiry timestamp creates a review condition; it must not silently restore authority. Restoration always requires an authorized Action and audit event.

### State-change Action

Working administrative Action name: `change_principal_access_state`. Basis-specific activation Actions may call the same internal transition primitive only after their own evidence and authority contracts pass.

Required input:

- target principal ID;
- requested target state;
- reason code;
- required human-readable reason;
- idempotency key;
- expected state version;
- optional review timestamp;
- request correlation ID.

Required guards:

- caller is an active platform administrator with the specific authority-management grant;
- caller cannot change their own access state through the ordinary Action;
- target exists;
- source-to-target transition is allowed;
- expected version matches current version;
- change cannot leave the platform without an active controlling administrator;
- parameters and reason are valid and non-sensitive;
- request is not a replay with conflicting parameters.

When the target is a `platform_admin`, permanent suspension, restoration, disabling, or reactivation follows Decision 2's dual-independent-approval contract. One active, eligible human platform administrator may apply an immediate temporary emergency suspension when compromise is suspected. Emergency suspension becomes effective immediately, creates an urgent audit event, and enters independent confirmation/recovery review. It never silently expires back to active.

Required atomic result:

- access state and version change;
- authority audit event containing before/after state, actor, target, reason, policy version, and correlation ID;
- required review or remediation next outcome;
- transactional outbox record when external session revocation or notification is required.

### Runtime enforcement

Changing the record alone is insufficient. Stage 2A must enforce access at both layers:

1. **Session layer** — prevent new or refreshed sessions for suspended/disabled principals where Supabase Auth administration supports it.
2. **Request layer** — deny existing JWTs through authoritative database/RPC/RLS and Edge Function checks.

The request-layer check is mandatory because a previously issued JWT can remain cryptographically valid after state changes.

**Decision 4 — approved:** A suspended principal receives no operational or domain access. A dedicated security/recovery function may return only a fixed minimal self-status notice containing the global state, a broad safe reason code, whether user action is required, and approved recovery/support instructions. It derives the principal from established identity or a short-lived, single-purpose, identity-bound, replay-protected recovery context; accepts no principal, organization, or domain object identifier; performs no domain joins; and never exposes the underlying access row or internal investigation reason.

Public sign-in and recovery flows return generic responses that do not reveal whether an identity exists, is suspended/disabled, belongs to an organization, or holds platform authority. `disabled` permits only generic denial, an approved appeal/support channel, and sign-out. Credential recovery alone never reactivates a disabled principal.

Suspension becomes effective through authoritative backend state before session-revocation propagation. Consequential Actions must re-evaluate and version-check or lock principal access inside the authoritative mutation transaction so an Action cannot pass immediately before suspension and commit afterward. Queued, uncommitted work re-evaluates the initiating principal at execution time; post-commit outbox effects may complete from the previously authorized committed event.

Session, token, client-cache, realtime-subscription, and background-access containment are defense in depth. Protected file access requires short-lived signed URLs or an equivalent re-authorizing proxy; permanent public URLs are prohibited. The platform can stop continued access and clear application-managed caches, but cannot guarantee recall of information already downloaded, copied, exported, or photographed.

Recovery submission never restores access. Restoration uses a separate Action, revalidates or rotates credentials and strong factors when compromise is suspected, invalidates pre-suspension sessions, creates only fresh post-restoration sessions, and restores principal access only. It does not silently restore a separately suspended or revoked platform role, organization membership, facility grant, or other authority.

Before Stage 2A implementation, a coverage manifest must inventory every path that can read protected data or execute an operational mutation:

- PostgREST/RLS tables and views;
- SECURITY DEFINER functions and RPCs;
- Edge Functions, especially service-role paths;
- Storage policies where protected rental evidence is involved;
- realtime subscriptions if used;
- background jobs, integration identities, and automation paths;
- frontend session bootstrap and authority snapshot loading.

Service-role execution must explicitly evaluate the initiating principal before bypassing RLS. A frontend check never satisfies this requirement.

## Formal authority separation

### Profile persona

`profiles.role_type` is currently used for persona and routing. It must be treated as legacy non-authoritative data during Stage 2B.

Target behavior:

- a profile may store a `default_portal` or equivalent preference;
- the value selects an interface only from portals the principal is actually authorized to use;
- changing the preference never grants platform or organization authority;
- users with both customer and vendor relationships may choose between permitted contexts;
- operations routes require verified platform authority, not profile persona.

### Platform authority

Platform authority is global ALLRENTZ operational authority and must be rare. The initial role catalog is:

- `platform_admin` — authority administration plus approved platform-wide operations;
- `operations_manager` — approved platform-wide operational actions but no role or access-state administration.

Customer and vendor are not platform roles. `platform_admin` and `operations_manager` are human-only roles. A grant to either role may target and remain effective only for a currently eligible human principal. Workload, service, integration, automation, scheduled-job, shared, demo/test, and AI-controlled identities are ineligible regardless of profile fields, authentication metadata, naming, prior access, or intended convenience.

The recommended target is a dedicated logical **Platform Role Grant** rather than continuing the mixed meaning of `user_roles`. A grant must include:

- grant ID;
- target eligible human principal;
- exact platform role;
- active, emergency-suspended, and revoked lifecycle;
- effective timestamp and optional expiration;
- grant and revoke Action IDs;
- grantor and revoker;
- required reason;
- version and correlation metadata.

Stage 2B must inventory all current `user_roles` readers and writers before choosing the migration shape. Existing customer/vendor rows must not be copied into platform-role grants. Existing admin/manager rows may be backfilled only after verifying their provenance and current intended authority.

### Organization authority

Organization authority remains contextual:

> authenticated principal + active organization membership + organization type/capability + object relationship + current state + evidence

Organization membership roles such as owner, admin, member, or viewer apply only within that organization. Membership in one organization cannot grant authority in another organization or at every facility.

Customer/vendor behavior derives from active membership in an eligible customer/vendor organization and the specific object's ownership, invitation, qualification, or award relationship. It must not derive from profile persona or a global user role.

### Future scoped grants

The long-term authority contract remains:

> **Principal × Action Type × Object Scope × Conditions × Effective Window × Delegation × Separation of Duties**

Facility-, project-, threshold-, risk-, equipment-class-, and transaction-scoped grants are future objects. Stage 2 must not implement the entire long-term grant engine. It must avoid schema and API decisions that prevent that later model.

## Atomic platform-role Actions

**Decision 2 — approved:** One active, eligible human `platform_admin` may grant or revoke `operations_manager` for another eligible human principal. Granting, permanently revoking, restoring, disabling, or materially changing `platform_admin` authority requires two independent authorized human beings. Nobody may request, approve, or execute their own authority change, and different accounts controlled by the same human do not satisfy independence. Workload principals cannot request, approve, execute, or count toward these decisions.

Platform roles use named commands rather than generic role CRUD:

- `grant_operations_manager`
- `revoke_operations_manager`
- `request_platform_admin_change`
- `approve_platform_admin_change`
- `emergency_suspend_platform_admin`

The platform-admin request records the exact target, change, requester, reason, evidence, scope, effective and expiration dates, policy version, request expiration, and correlation ID. Final approval re-evaluates the current target, requester, approver, policy, quorum, and authority state. It fails when the request expired, either human lost authority, the target changed incompatibly, the policy changed, or the result would remove recoverable governance.

A single active, eligible human platform administrator may immediately apply a temporary emergency suspension to another administrator when compromise is suspected. The suspension affects principal access or only the platform-role grant according to the documented incident scope, takes effect before session-revocation propagation, and requires independent eligible-human confirmation/recovery review. It cannot become permanent revocation through one-person action and cannot silently auto-restore on expiry.

### Grant contract

Required input:

- target principal ID;
- platform role;
- effective timestamp;
- optional expiration;
- required reason code and reason text;
- idempotency key;
- expected target authority version;
- correlation ID.

Required guards:

- caller access state is `active`;
- caller holds active `platform_admin` authority with authority-management capability;
- caller remains an eligible human principal and the platform-role grant is currently effective;
- caller is not the target;
- target access state is `active`;
- target principal kind is `human_principal`, established through the controlled identity process;
- target currently satisfies platform-role eligibility, including individual control and required strong-factor policy;
- requested role is in the platform-role allowlist;
- no equivalent active grant exists;
- effective/expiration values are valid;
- request does not violate separation-of-duties policy;
- expected version matches;
- replay parameters match the original idempotency record.

### Revoke contract

The revoke Action uses the same caller, reason, concurrency, idempotency, and audit requirements and additionally proves:

- the active grant exists;
- the caller is not revoking their own grant through the ordinary Action;
- the change will not remove the final recoverable platform administrator without replacement or controlled recovery authority;
- the grant is marked revoked rather than silently deleted.

For `platform_admin`, the approving principal must be an eligible human independent from the requester and target, and the approved request must still match the exact current change. For `operations_manager`, one active, eligible human platform administrator may execute the grant or revoke directly, provided the caller is not the target and all ordinary guards pass.

Human-principal classification and current platform-role eligibility are re-evaluated for every initial grant, extension, successor grant, restoration, revalidation, migration, bootstrap, disaster-recovery operation, quorum calculation, and dual-approval decision. A previously valid grant becomes immediately ineffective when its principal is shared, ambiguous, incorrectly classified, superseded, converted in practice to non-human control, or otherwise no longer eligible. The grant remains historical and enters owned review; review never prolongs questionable authority. Re-enabling authority requires the correctly approved Action and never follows automatically from profile, credential, access-state, or classification correction.

### Transaction boundary

Each successful grant or revoke commits atomically:

1. role-grant lifecycle change;
2. authority version change;
3. append-only authority audit event;
4. idempotency result;
5. any required next review/outbox record.

A notification failure must not roll back a committed authority change. Notifications and external session operations should use a transactional outbox and retry policy.

### Bootstrap and break-glass

Ordinary client or admin Actions cannot create the first platform administrator.

**Decision 5 — approved:** Greenfield bootstrap creates two independent, verified, active, strongly authenticated human platform administrators through a one-time, environment-bound, externally controlled ceremony. Two is the minimum initial quorum. The intended steady state is at least three independent recoverable administrators using two-person approval, established through the first ordinary dual-approved grant after bootstrap.

Bootstrap applies only to an environment that has never had platform authority. Before execution it must prove that bootstrap has never been consumed and that no new platform-role grant, legacy `user_roles` authority, historical authority record, or external ceremony ledger indicates existing authority. Legitimate existing authority uses the separately reviewed Decision 6 migration process. Ambiguous provenance blocks both migration and bootstrap.

The two targets must be separate eligible human principals representing separate human beings, not merely separate user IDs. Principal kind, identity, credential ownership, phishing-resistant strong-factor enrollment where supported, recovery channels, production eligibility, and independence must be verified before execution. Shared identities, alternate accounts controlled by one person, demo/test/service/workload identities, automation, and AI-controlled identities are prohibited. Bootstrap grants authority; it does not create or store credentials.

Bootstrap targets must already be `active` through a proven onboarding basis, or the approved bootstrap manifest must separately authorize principal activation. When activation is included, the transaction and audit trail distinguish principal activation, platform-role grant, and bootstrap consumption. A role grant never silently implies activation.

The approved ceremony manifest records an immutable external authorization ID, digest, approver identities, target principal identities, environment identifier, exact Actions, issue/expiration times, approval timestamps, policy version, and single-use nonce. It contains no credentials or recovery secrets.

One transaction must:

1. acquire an environment-specific concurrency lock;
2. verify the database and independent external bootstrap ledgers are unconsumed;
3. verify that no current, legacy, historical, or recoverable platform authority exists;
4. verify the two exact targets and approved manifest;
5. apply separately authorized activation transitions when required;
6. create both platform-role grants;
7. write the correlated activation, grant, and ceremony audit events;
8. mark bootstrap permanently consumed; and
9. commit all results together.

A failed transaction creates no grant and does not consume bootstrap. Consumption is also recorded in an independent external control-plane ledger. If either ledger says bootstrap was consumed, execution fails closed. A database restore must reconcile the external marker before privileged operation resumes. Bootstrap can never be re-enabled; later quorum loss uses recovery.

Disaster recovery is separate from bootstrap and is permitted only when fewer than two independent recoverable platform administrators can safely operate the ordinary approval process. It restores the minimum safe quorum rather than creating unnecessary authority. Recovery requires two independent eligible human approvals and eligible human targets plus a short-lived, single-use authorization bound to one environment, named targets, exact Actions, policy version, and expiration. Workload principals cannot approve recovery, receive recovered human platform authority, or count toward the restored quorum.

Recovery uses a tightly scoped external privileged channel under custody independent from normal application administration. It is not public or application-accessible, accepts only the approved manifest, permits only the named recovery operation, expires automatically, invalidates immediately after use, and produces independent external and database audit evidence.

Recovery distinguishes credential/strong-factor reset, session containment, principal-access restoration, platform-role grant restoration or replacement, and organization authority. None silently restores another. Recovery is not a general database repair console.

No permanent hidden root account, shared administrator credential, public recovery RPC, application-accessible service-role bypass, hardcoded identity, repository secret, demo identity, AI-controlled identity, or unaudited database edit is permitted.

Bootstrap and recovery require non-production exercises proving environment guards, replay denial, concurrency control, atomic rollback, simulated-identity rejection, and external authorization custody. Production recovery remains incident-driven and requires post-recovery security review.

### Existing authority provenance and migration

**Decision 6 — approved:** Existing access may be preserved only when its origin, owner, environment, scope, intended authority, current need, and approval basis can be proven. Historical `admin` or `manager` labels are not authority evidence by themselves.

The inventory is bounded to one complete pass over every current elevated-authority source relevant to platform administration or operations management, including profile/persona fields, organization memberships, authentication metadata, platform-role tables, RLS policies, helper and `SECURITY DEFINER` functions, Edge Functions, backend commands, frontend checks, hardcoded identities and allowlists, seed/demo/test data, configuration and environment references, test fixtures, local bootstrap records, and evidenced manual database changes. Supabase project access, database roles, deployment/CI access, service credentials, scheduled jobs, webhooks, and other control-plane authority must also be inventoried, but they remain infrastructure or workload authority and must not be translated into human application roles.

Classification applies to each authority claim, identified by principal, environment, authority source, and scope. It does not classify an entire person. One person may have a verified organization membership and a separate unsupported platform claim.

Evidence classification and migration disposition are separate:

| Evidence classification | Meaning |
| --- | --- |
| `VERIFIED` | Identity, origin, intended scope, approval basis, and current need are adequately supported without unresolved contradiction. |
| `INCOMPLETE` | The identity or purpose may be legitimate, but required provenance is missing. |
| `CONFLICTING` | Current sources assert incompatible identities, roles, scopes, or states. |
| `ORPHANED` | No accountable identity or owner can be established. |
| `TEST_OR_DEMO` | The claim belongs to test, demo, seed, simulation, automation, service, or AI context and is ineligible for human production authority. |
| `UNKNOWN` | Available evidence cannot establish the claim's origin or intended authority. |

| Disposition | Required outcome |
| --- | --- |
| `MIGRATE` | Include an independently approved, verified claim in the exact migration manifest. |
| `HOLD_FOR_REVIEW` | Create owned remediation work; confer no effective new authority. |
| `REVOKE` | Remove obsolete, unauthorized, duplicated, unsupported, or superseded authority through the controlled cutover. |
| `REPLACE_WITH_NEW_GRANT` | Revoke the unsupported historical claim and use the ordinary Decision 2 grant process or, when ordinary quorum cannot operate, the Decision 5 recovery process. This is a new grant, not migrated provenance. |
| `NO_AUTHORITY` | Preserve the evidence record but create no elevated grant. |

Only a `VERIFIED` claim for a currently eligible human principal is eligible to be proposed for migration into a human platform role; eligibility never causes automatic migration. `INCOMPLETE`, `CONFLICTING`, `ORPHANED`, `TEST_OR_DEMO`, and `UNKNOWN` claims fail closed. Service, integration, automation, scheduled-job, workload, shared, and AI-controlled claims cannot migrate into `platform_admin` or `operations_manager`; any legitimate machine need enters a separate workload-grant inventory and approval process. Current business need without historical provenance may justify requesting a new grant, but it cannot retroactively legitimize or relabel the historical claim.

Adequate provenance must establish the exact principal and environment, authoritative principal kind, the original authority source and source-record identifier, the intended role and scope, the accountable original owner or approval basis, current business need, current identity control, and absence or resolution of contradictory evidence. For `platform_admin` and `operations_manager`, the target must be a verified eligible human principal with required strong-factor authentication and must satisfy Decisions 2 and 5 where applicable. A profile label, page access, email allowlist, service credential use, project creation, frontend condition, authentication metadata value, naming convention, AI classification, or self-attestation is insufficient alone.

Generic historical `manager` authority must be resolved to its actual business scope. Organization administrator, customer manager, vendor manager, operations staff, `operations_manager`, and `platform_admin` are distinct. Evidence proving only organization authority may create or preserve only the correct scoped organization membership; it cannot create platform authority.

Principal access and role grants remain independent. Migration never activates, restores, or removes a principal restriction. An active migrated grant may be created only for an eligible `active` principal. A claim associated with a pending, globally restricted, suspended, or disabled principal may retain its evidence and approved disposition, but must not become effective authority. Any later activation, restoration, or role grant requires its own authorized Action and audit event.

Existing or ambiguous authority proves that an environment is not greenfield. Decision 5 bootstrap is therefore prohibited. If fewer than two independent recoverable administrators remain after evidence classification, the controlled Decision 5 recovery process must establish the minimum safe quorum before ordinary administration or final cutover proceeds. Unsupported historical authority must never be grandfathered merely to satisfy quorum. The intended steady state remains at least three independent recoverable administrators.

The approved migration manifest records each exact claim and disposition, source-record references and evidence digests, target principal, environment, prior role/scope, resulting role/scope/state, independent reviewer and approver identities, reason, policy version, issue and expiration times, migration batch, correlation ID, idempotency key, and manifest digest. It contains no credentials or unnecessary protected evidence. No person may validate, request, review, or approve their own elevated authority. `platform_admin` migration requires two independent authorized human approvals. Legacy access alone cannot establish approver eligibility.

Migration uses a coordinated, environment-bound, fail-closed cutover; it must not claim atomicity across database, source code, authentication, deployment configuration, and external control planes. The process must:

1. produce the read-only authority-claim inventory;
2. generate and independently approve the exact expiring manifest;
3. dry-run the manifest, including additions, revocations, unchanged claims, effective-authority diff, administrator quorum, and all unresolved records;
4. freeze ordinary authority changes and verify the expected database, policy, and manifest versions;
5. apply related database grants, revocations, provenance records, audit events, migration-batch state, and authority-version change in one transaction;
6. disable every inventoried non-database legacy authority path through its controlled deployment/configuration boundary;
7. revoke elevated sessions and invalidate cached authority snapshots so fresh authentication evaluates the new model;
8. reconcile every effective elevated grant exactly against the approved manifest and separately authorized post-manifest Actions; and
9. record completion in database and independently controlled migration ledgers before privileged operation resumes.

The process is idempotent. Replaying the same approved manifest cannot duplicate grants, broaden scope, or repeat revocations. Wrong-environment, altered, expired, stale-policy, stale-version, conflicting, or partially applied manifests fail closed. An indeterminate cross-system cutover state denies privileged operation and creates owned recovery work. Rollback uses a forward correction and must never reactivate legacy authority. A database restore must reconcile the independent cutover marker and authority-policy version before privileged operation resumes.

Legacy fields such as `profiles.role` may remain temporarily only after every consumer is inventoried. They must be non-writable by clients, excluded from RLS and backend authorization, explicitly deprecated, and mechanically derived as a presentation projection where practical. They cannot remain a manually maintained second source of truth and may be removed only through a later controlled compatibility change.

After migration, every elevated claim must resolve to a verified `platform_admin` grant, verified `operations_manager` grant, scoped organization membership, owned pending review with no effective authority, or no elevated authority. The controlling reconciliation invariant is:

> Effective elevated authority equals exactly the grants in the approved migration manifest plus separately approved post-manifest Actions.

Frontend state, profile fields, authentication metadata, hardcoded identities, service credentials, old seed/demo data, and unexplained historical access must confer no application authority.

### Time-based authority windows, expiration, and restoration

**Decision 7 — approved:** Time may enforce the effective window of a previously authorized grant, delegation, invitation, membership term, restriction, or recovery instrument. Time may not independently decide, broaden, renew, extend, recreate, reactivate, or restore authority.

A properly authorized future-effective object may become usable only within its approved half-open interval:

> `[effective_at, expires_at)`

It is valid at `effective_at` and invalid at the exact `expires_at` instant. `expires_at = NULL` is permitted only for authority types whose approved policy explicitly allows an open-ended term and requires a separate review schedule. A hidden far-future timestamp is not a substitute for that policy.

The original authorized Action creates the authority and its exact scope, policy version, start, and end. Time only evaluates that approved window. Ordinary Actions cannot create retroactive authority: a past `effective_at` never makes authority effective before the authorizing transaction committed. A scheduled grant that is revoked, suspended, superseded, or rendered ineligible before its start must not become usable merely because its start time arrives.

Opening an approved time window never bypasses current authorization. Every use still evaluates current principal access, grant state, organization/facility/project scope, restrictions, evidence validity, separation of duties, policy version, and object state. High-risk future-effective authority may additionally require an idempotent activation Action at the start boundary. If eligibility or policy changed after approval, activation fails closed and creates owned review work.

Expiration, revocation, suspension, release, and restoration are distinct outcomes:

| Outcome | Meaning |
| --- | --- |
| `EXPIRED` | The previously approved authority window ended naturally. |
| `REVOKED` | An authorized Action ended authority before its planned expiration. |
| `SUSPENDED` | Authority was contained because of security, identity, integrity, investigation, safety, compliance, fraud, or serious operational risk. |
| `RELEASED` | A specific denial or hold ended through its approved release process. |
| `RESTORED` | A separate authorized Action re-established one exact previously contained authority component after current conditions were re-evaluated. |

Expiration is object-specific and never deletes history. An expired authority grant or delegation no longer permits its named Actions; an expired organization-membership term removes only that organization's participation authority; expired facility/project authority removes only that scope; an expired invitation or approval request can no longer be accepted or approved; an expired recovery authorization becomes unusable; expired compliance evidence becomes invalid evidence without erasing the organization or principal; and an expired platform-role grant removes only that platform authority.

`effective_at`, `expires_at`, and `review_due_at` are separate fields with separate meanings. `review_due_at` creates an owned review or escalation task and never changes authority by itself. If policy requires authority to end when review is overdue, that end must be represented by the approved `expires_at`; a scheduler delay or notification failure cannot become an undocumented grace period.

Natural expiration remains historical. Authority needed after expiration uses a new successor grant or versioned authority term linked to the durable relationship; it does not rewrite the expired record to active. A pre-expiration extension must be versioned and approved at the same level as the original grant. After expiration, renewal is a new approval outcome. Extending, replacing, renewing, revalidating, or restoring a human platform role rechecks authoritative human-principal classification and current platform-role eligibility. Extending, replacing, or renewing `platform_admin` authority also requires dual independent approval under Decision 2. No successor may be backdated to cover an unauthorized gap.

A scoped restriction is a denial and ordinarily remains until an authorized release Action. A narrowly allowlisted, low-risk temporary operational hold may have a pre-authorized automatic release process only when the creation Action fixed its exact scope, earliest release time, policy version, and release conditions. At or after `release_not_before`, an idempotent backend system Action must re-evaluate the underlying grant, current principal and object versions, every overlapping denial, and all required evidence; atomically record `RELEASED`, its audit event, and its next step; and only then stop applying the hold. Delay or failure leaves the denial effective.

Security-, identity-, safety-, compliance-, fraud-, investigation-, principal-wide-, and `platform_admin`-related restrictions never auto-release. Their review deadline creates independent escalation while denial remains effective. Emergency `platform_admin` suspension requires a second independent reviewer to choose `CONFIRM_SUSPENSION`, `RESTORE`, `REQUEST_PERMANENT_REVOCATION`, or `ESCALATE_TO_EXTERNAL_RECOVERY`. Missing ordinary quorum invokes Decision 5 recovery. The deadline never silently restores authority, never silently creates permanent revocation, and cannot leave the matter without an accountable escalation owner and response deadline.

Principal restoration and grant restoration are separate. Suspending a principal must place consequential platform and scoped grants into a separately revalidated ineffective state where policy requires, so restoring login eligibility cannot silently reactivate them. Restoring a principal does not restore a suspended or expired `platform_admin` or `operations_manager` grant, organization membership term, facility/project grant, credential eligibility, session eligibility, or other authority. Each restored component must be named and re-evaluated by its correctly approved Action.

Authorization uses one trusted database/server UTC time source and stores timezone-aware instants. Client clocks are display-only. User-entered local schedules are converted using the relevant facility timezone, which is retained as operational context; daylight-saving changes cannot alter the approved UTC instant. Policy defines maximum durations by authority type. Grace time is allowed only when explicitly approved and represented inside the actual authority window.

The authoritative decision instant for a consequential mutation occurs inside its short backend transaction immediately before the atomic state change, using one captured current database instant rather than an earlier request, screen-load, or transaction-start instant. Loading a screen, receiving a request, or beginning preliminary work before expiration preserves no authority. Long-running preparation occurs outside the final mutation transaction and the final Action rechecks principal, grant, restriction, object version, and time. If authoritative time cannot be evaluated reliably, the consequential Action fails closed.

**Non-normative PostgreSQL planning note:** `CURRENT_TIMESTAMP`, `now()`, and `transaction_timestamp()` report the transaction start; `statement_timestamp()` reports the current statement start; and `clock_timestamp()` reports actual wall-clock time. Implementation planning must select and test a mechanism that captures one suitable current instant after required locks and immediately before final authorization, evaluates all relevant predicates against that same instant, and then performs the mutation and audit atomically. This specification does not claim a commit-time timestamp guarantee.

Every protected request evaluates the effective window directly, so a delayed scheduler cannot extend expired authority. An idempotent expiration process may materialize `EXPIRED`, write the audit event, create the next task or terminal outcome, invalidate sessions/caches/realtime subscriptions, and dispatch notifications; that process is not the security boundary for expiration. One transition wins under concurrency, repeated events return the original outcome, and stale or conflicting attempts fail without partial effects.

Backend reads and mutations MUST deny from current authoritative state at request execution, regardless of stale frontend state or previously issued convenience claims. Session, cache, and delegated-token lifetimes MUST be minimized, bounded by policy, and rechecked at consequential use. Offline capture time is evidence only: queued field Actions, automation, and integrations re-evaluate authority at server execution unless they are post-commit effects from an already authorized transaction.

Realtime delivery modes require separate inventory and tests. PostgreSQL Changes remains subject to its documented row-authorization behavior. Broadcast and Presence authorization may be cached for the life of a connection and recalculated only on connection or a new JWT; active disconnect, short JWT expiry, and channel-specific policy are therefore containment controls, not proof of instantaneous revocation. A principal whose authority ends MUST be denied new protected subscriptions and backend operations immediately, and existing protected connections MUST be actively disconnected where the provider supports it.

Signed URLs and comparable delegated bearer artifacts are residual-access capabilities, not live authorization checks. Supabase Storage signed URLs use a separate signing key from Auth keys and can remain usable until expiry; cached content may remain retrievable beyond token expiry for the configured CDN cache interval. Issuance MUST therefore be authorized and audited, TTL and object `cacheControl` MUST be bounded together, and new issuance or refresh MUST stop immediately when authority ends. Evidence whose risk requires immediate future-read revocation MUST use an authenticated, backend-mediated, tested revocable delivery path instead of a bearer signed URL. No control can revoke a copy already downloaded; the system can only stop future reads, refresh, mutation, or subscription and record the residual exposure.

State/grant change, audit event, and transactional outbox entry commit together. Notification failure creates retry or owned operational work and never extends, removes, grants, or restores authority.

## Authorization evaluation order

Every material human, API, automation, or AI-proposed Action must evaluate in this order:

1. authenticate the initiating principal;
2. load and verify current principal access state: `disabled` and `suspended` deny operational access, `pending_activation` permits only basis-specific activation Actions, globally `restricted` permits only reason-specific remediation, and only `active` proceeds to ordinary authority evaluation;
3. verify tenant and protected-data visibility;
4. verify the required platform or organization grant, exact scope, current state, and effective time window;
5. apply every matching scoped restriction, with an explicit deny overriding any otherwise valid grant;
6. verify the target object and current canonical state;
7. verify ownership, membership, invitation, qualification, and other linked relationships;
8. verify required evidence and its current validity;
9. verify threshold, risk, facility, separation-of-duties, and effective-time conditions;
10. validate parameters, expected version, and idempotency key;
11. commit the business and audit changes atomically;
12. create the next authorized action, owned task, waiting condition, automated follow-up, or terminal outcome;
13. dispatch notifications and integrations after commit.

A failure at any step denies the Action without attempting later mutation steps. No frontend state, profile persona, AI output, broad platform role, or lower-priority allow may override a denial established earlier in this order.

## Privileged database-function security baseline

This section defines technical constraints for implementation planning without selecting final database object names.

- Each privileged database function MUST have one named business purpose and a minimal parameter contract.
- Invoker rights are the default. Definer rights MAY be used only when the Action cannot safely satisfy its contract with invoker rights.
- A definer-rights function MUST use a safe explicit `search_path` or an empty `search_path` with schema-qualified objects; it MUST NOT resolve authority-critical objects through a caller-influenced path.
- Default function execution MUST be revoked from `PUBLIC` and every unintended role, then granted only to the exact approved caller roles.
- The Action MUST derive the initiating principal and acting organization from trustworthy execution context wherever possible. Caller-supplied identity or organization values MUST NOT establish authority when the system can derive them.
- The Action MUST re-evaluate current principal state, scope, target, policy, version, restrictions, and evidence internally before mutation. Possession of service-role or function execution privilege is not the authorization decision.
- The mutation, required audit event, and transactional outbox record MUST be one atomic result.
- Direct RPC invocation, forged identity/scope parameters, unauthenticated calls, unauthorized roles, stale versions, replay, cross-organization identifiers, and unsafe function-resolution paths MUST have negative tests.

## Audit and security-log boundary

Two connected but distinct records are required.

### Authority/domain audit ledger

Records meaningful authority and business Actions, including:

- access-state changes;
- platform-role grants and revocations;
- approved or rejected authoritative commands after the target and policy context are established;
- actor, target, acting organization, prior/resulting state, reason, policy version, timestamp, outcome, and correlation ID;
- affected grant/object IDs and next outcome.

The successful mutation and audit event must be atomic. Ordinary clients cannot update or delete these events.

### Security and technical log

Records technical/security activity such as:

- authentication failures;
- malformed or unauthenticated requests;
- routine RLS denials;
- rate limits;
- invalid/expired tokens;
- duplicate callbacks and integration failures;
- suspicious automation or AI attempts.

Raw tokens, credentials, protected cross-tenant data, and unnecessary request bodies must never be copied into either record. Significant patterns may create a summarized domain-risk event through a separately governed process.

## Data trust model

The architecture benchmark's proposed data-quality labels represent multiple independent dimensions and must not become one overloaded enum.

| Dimension | Candidate values | Question answered |
| --- | --- | --- |
| Acquisition method | asserted, observed, derived | How was the fact obtained? |
| Verification state | unverified, under_review, verified, rejected | Has an authorized process verified it? |
| Freshness | current, stale, expired | Is it current enough for its permitted use? |
| Conflict state | uncontested, disputed | Is a material contradiction unresolved? |
| Record lifecycle | active, superseded, revoked | Is this version still the controlling record? |

These dimensions are a long-term data contract, not Stage 2 schema scope. Stage 2 authority Actions must nevertheless fail closed when required authority evidence is stale, disputed, expired, superseded, or unverified.

## Long-term architecture boundary

The July 22 architecture benchmark is an approved directional reference only after these corrections:

- `Rental Work Package` remains a candidate name. No current object is renamed. The neutral concept is a durable Rental Execution Record connecting the original need to sourcing, award, fulfillment, evidence, billing, and closeout.
- Asset assignment, delivery movement, custody, commercial rental period, pickup movement, and billing determination remain separate state machines.
- Vendor Quote remains an immutable/versioned offer; Award Decision records what was selected, including split or partial awards.
- Organization identity, commercial readiness, facility authorization, RFQ participation, sales opportunity, and rental execution remain separate.
- A workflow outcome may be a next authorized action, owned task, waiting condition, automated follow-up, or terminal outcome.

Stage 2 must not build dispatch, telematics, worker credentialing, offshore access, invoice reconciliation, vendor-performance scoring, advanced break-glass controls, or a generalized ontology/grant platform.

The current MVP boundary remains:

> Structured RFQ → RFQ items → qualified vendor match → authorized invitation → quote submission → quote comparison → approval → governed state transition → audit history

## Implementation sequence after architecture approval

### Stage 2A — Principal access state

Authorized file scope must be defined separately. Expected work:

- forward-only principal-access schema and backfill;
- one atomic access-state Action;
- explicit non-restoring suspension/restriction/recovery time semantics;
- session and request-layer enforcement coverage;
- Edge Function/service-role checks;
- minimal frontend handling of denied or remediation-only states;
- generated types;
- positive and negative runtime verification.

Stage 2A closes authoritative status semantics only when every inventoried path enforces the state and existing-session denial is proven.

### Stage 2B — Authority-source separation

Expected work:

- authoritative, backend-controlled, immutable principal-kind classification with a controlled supersession process for corrections;
- dedicated platform-role authority source;
- separate workload-grant contract and inventory that cannot confer human platform authority;
- bounded authority-claim inventory and evidence/disposition classification;
- environment-bound migration manifest, dry-run, independent approval, and exact post-cutover reconciliation;
- migration of verified admin/manager claims only, with unsupported but still-needed access handled as new grants;
- authority-version cutover, elevated-session revocation, and restore-safe independent migration marker;
- versioned authority terms with explicit effective, expiration, and review timestamps;
- removal of customer/vendor meaning from platform roles;
- profile persona/default-portal contract;
- read-only derived compatibility projection for any temporarily retained legacy role field;
- backend-derived frontend authority snapshot;
- operations-route decisions based on platform authority;
- organization behavior based on membership and object relationships;
- negative cross-domain authority tests.

### Stage 2C — Privileged platform-role Actions

Expected work:

- atomic grant/revoke commands;
- human-principal and current platform-role-eligibility guards on every grant, extension, successor, restoration, revalidation, recovery, approval, and quorum path;
- versioned future-effective, expiration, extension, successor-grant, suspension, release, and exact restoration Actions;
- concurrency and idempotency enforcement;
- anti-self-elevation and anti-lockout guards;
- append-only authority audit events;
- direct-write denial verification;
- positive, negative, replay, and concurrent runtime tests.

No stage may claim the full Blockers 2 and 3 are closed until all three stages pass their acceptance tests together.

## Required verification contracts

### Principal access

- active principal retains all previously authorized behavior;
- pending principals can use only an approved, basis-specific activation path and cannot obtain operational data or authority merely by authenticating;
- globally restricted principals can use only reason-specific remediation; scoped restrictions deny only their defined scope and do not manufacture unrelated authority;
- remediation submission never restores access, a grant, or a membership;
- suspended and disabled principals cannot execute operational Actions, including with a previously valid JWT;
- suspended principals receive only the fixed, safe, non-enumerating self-access notice and approved recovery path;
- queued uncommitted work re-evaluates principal state, and a suspension racing a consequential Action prevents the later commit;
- new protected-file reads and signed-link issuance are denied immediately after suspension; any already issued bearer URL has an explicitly bounded TTL/cache residual and high-risk evidence uses a tested revocable delivery path;
- recovery invalidates old sessions and does not automatically restore roles, memberships, grants, or other authority;
- service-role backend paths cannot bypass the initiating principal check;
- non-active principals cannot read protected cross-tenant or domain data;
- only explicitly approved self-status, activation, remediation, or recovery access remains;
- direct client access-state writes return denial and persist no changes;
- stale-version and conflicting replay requests fail deterministically;
- state change and audit event commit or roll back together.

### Authority separation

- changing profile persona cannot grant platform or organization authority;
- customer/vendor capability derives from active organization relationships;
- membership in one organization grants nothing in another;
- a dual-context user can select only portals backed by current authority;
- operations access requires active platform authority;
- platform roles do not manufacture vendor/customer relationships;
- archived or otherwise inactive memberships grant no authority.

### Principal class and workload authority

- `AUTH-CLASS-001`: a workload/service principal cannot receive or exercise `platform_admin`;
- `AUTH-CLASS-002`: a workload/service principal cannot receive or exercise `operations_manager`;
- `AUTH-CLASS-003`: demo, test, shared, automated, scheduled-job, and AI-controlled workload principals cannot receive either human platform role;
- `AUTH-CLASS-004`: editing profile data, frontend state, self-asserted values, names, or editable authentication metadata cannot establish or change principal kind or platform-role eligibility;
- `AUTH-CLASS-005`: principal kind cannot be changed in place; a controlled correction supersedes the old principal, transfers no authority automatically, and independently re-evaluates every grant;
- `AUTH-CLASS-006`: a workload principal cannot request, approve, execute, restore, extend, or revalidate a human platform-role change;
- `AUTH-CLASS-007`: two workload principals cannot satisfy dual approval, and two principal records controlled by one human cannot satisfy human independence;
- `AUTH-CLASS-008`: workload principals do not count toward bootstrap, ordinary, migration, recovery, or anti-lockout administrator quorum;
- `AUTH-CLASS-009`: migration cannot convert a legacy service, automation, shared, demo/test, scheduled-job, or AI-controlled identity into a human platform-role holder;
- `AUTH-CLASS-010`: restoration, extension, successor grant, revalidation, and disaster recovery cannot reactivate or create a human platform role for a non-human or currently ineligible principal;
- `AUTH-CLASS-011`: an existing platform grant becomes ineffective immediately when human classification or current eligibility is invalid, ambiguous, lost, or superseded, and owned review does not prolong authority;
- `AUTH-CLASS-012`: loss of required strong-factor enrollment or individual identity control leaves principal kind human but makes the platform grant ineffective until a separately authorized revalidation/restoration succeeds;
- `AUTH-CLASS-013`: a workload grant requires exact owner, environment, Actions, tenant/object scope, effective window, credential lifecycle, audit, and revocation controls and rejects broad administrative labels;
- `AUTH-CLASS-014`: loss of an accountable workload owner makes the grant ineffective or fail closed under its approved policy until controlled ownership and grant review succeeds;
- `AUTH-CLASS-015`: human-delegated AI or automation cannot exceed the intersection of the initiating human's current authority and the workload grant, and records both identities in the audit context;
- `AUTH-CLASS-016`: workload credentials cannot be used for interactive human login, self-elevation, independent delegation, or an alternate authority path.

### Platform-role Actions

- authorized administrator can grant and revoke allowed roles;
- operations manager cannot administer roles or access states;
- caller cannot self-elevate, self-revoke, or self-suspend through ordinary Actions;
- granting, permanently revoking, restoring, or materially changing `platform_admin` requires two independent authorized and currently eligible human principals;
- requester and approver must be distinct people, remain authorized at final approval, and cannot control each other's identities;
- expired, stale-policy, changed-target, incompatible-state, or quorum-breaking requests are denied at final approval;
- one administrator may apply an immediate, scoped emergency suspension, but cannot convert it into permanent revocation or silent restoration without independent review;
- target must be eligible and active;
- duplicate same-parameter replay is idempotent;
- conflicting replay is denied;
- concurrent duplicate grants create one active result;
- direct client INSERT/UPDATE/DELETE remains denied;
- the final recoverable administrator cannot be permanently removed through the ordinary process unless a replacement or approved controlled recovery authority exists;
- grant/revoke and audit event are atomic;
- audit events contain no credentials or protected request material.

### Bootstrap and recovery

- bootstrap succeeds only in a never-authorized environment with an approved, unexpired, environment-bound manifest for two independent verified and currently eligible human targets;
- legacy authority, authority history, an external consumption marker, ambiguous provenance, wrong environment, replay, or simulated/shared identity fails closed;
- concurrent bootstrap attempts produce one complete result, and transaction failure produces no grant or consumed database marker;
- the independent external ledger prevents bootstrap reuse after database rollback or restore;
- bootstrap activation, platform-role grants, audit events, and consumption remain distinct records within one atomic result;
- successful bootstrap creates exactly the approved minimum quorum and no credential, hidden root, service shortcut, or public recovery path;
- disaster recovery is unavailable while ordinary quorum can operate and restores only the minimum approved authority components;
- credential reset, principal restoration, role restoration or replacement, session containment, and organization authority remain independent recovery operations;
- non-production exercises prove wrong-environment denial, replay denial, concurrency safety, rollback behavior, target independence, and authorization custody.

### Existing authority migration

- inventory covers every application and control-plane authority source while keeping infrastructure/workload authority separate from human application roles;
- classification is performed per principal, environment, authority source, and scope rather than per person;
- only independently approved `VERIFIED` claims appear as migrated grants;
- incomplete, conflicting, orphaned, test/demo, automated, shared, and unknown claims produce no effective authority;
- unsupported but still-needed access is revoked and replaced through a separately approved new-grant or recovery Action, never relabeled as migrated authority;
- generic manager claims resolve only to their proven organization or platform scope;
- a non-active or otherwise ineligible principal receives no effective migrated platform grant and is not silently activated or restored;
- bootstrap is rejected whenever current, historical, or ambiguous authority exists;
- migration cannot proceed to ordinary operation without at least two independent recoverable administrators and targets a steady state of at least three;
- wrong-environment, altered, expired, stale-policy, stale-version, replayed, conflicting, and concurrent manifests fail deterministically;
- same-manifest replay is idempotent and cannot duplicate or broaden a grant;
- transactional failure leaves no partial database grant, revocation, provenance, audit, or authority-version result;
- an interrupted cross-system cutover fails closed, creates owned recovery work, and cannot restore legacy authority;
- elevated pre-cutover sessions and cached authority snapshots cannot exercise old authority after the version change;
- database restore requires successful reconciliation with the independent migration marker before privileged operation resumes;
- legacy profile, metadata, frontend, allowlist, seed/demo, and service-credential paths confer no application authority;
- post-cutover reconciliation proves that effective elevated authority exactly equals the approved manifest plus separately approved later Actions.

### Time-based authority

- future-effective authority is unusable before its approved start and is denied at the exact expiration instant;
- authority approved with a past start cannot become retroactively effective before the authorizing transaction;
- a scheduled grant revoked, suspended, superseded, or rendered ineligible before its start never activates;
- every use of an open window still evaluates current principal, grant, restriction, evidence, policy, scope, and object state;
- `effective_at`, `expires_at`, and `review_due_at` produce their distinct specified outcomes;
- expiration, revocation, suspension, release, and restoration remain distinguishable in state and audit history;
- every object type loses only its own authority scope at expiration and preserves its historical record;
- expiration is enforced directly even when the materialization scheduler, cache invalidation, or notification is delayed;
- an expired grant or membership term cannot be rewritten active; continuation uses an approved successor/version, and no successor backfills an unauthorized gap;
- a low-risk pre-authorized hold releases only after its backend release Action rechecks all conditions and atomically audits `RELEASED`;
- serious, principal-wide, and privileged-role restrictions never auto-release and always create owned independent escalation;
- an overdue emergency suspension neither restores authority nor becomes permanent revocation, and quorum loss invokes controlled recovery;
- restoring principal access does not restore a separately affected platform role, membership term, scoped grant, credential, or session;
- policy-defined maximum durations and explicit authority windows prevent hidden grace periods;
- the final mutation transaction captures one suitable current authoritative instant after required locks, evaluates all time predicates against it, and rejects an authority window that ended before that decision;
- stale screens, cached claims, existing sessions, offline work, queued automation, and delegated tokens cannot authorize a new backend read or mutation after current authority ends;
- Realtime modes are inventoried separately; Broadcast/Presence containment proves new-connection denial plus active disconnect or bounded JWT expiry, and PostgreSQL Changes behavior is tested against its actual row-authorization model;
- signed URLs and CDN caching are tested as residual bearer access: issuance stops immediately, TTL and cache duration are bounded together, high-risk evidence uses a revocable delivery path, and no test claims to revoke data already downloaded;
- repeated expiration/release events are idempotent, concurrent transitions produce one winner, and stale versions fail without partial mutation;
- state change, audit event, and outbox entry are atomic, while notification failure has no authority effect.

### Regression

- API-key migration verification;
- membership and organization isolation verification;
- RFQ lifecycle and database enforcement verification;
- vendor invitation, quote, and authority verification;
- tests, TypeScript, lint, and production build;
- exact migration, generated-type, code, test, and documentation scope review.

## Decision-coherence matrix

This matrix is normative at the architecture level. Its test IDs reserve future acceptance cases; they are not claims that implementation or tests currently exist.

| Interaction | Controlling decisions | Invariants | Required outcome | Scope, recovery, and next step | Required audit | Future test ID |
| --- | --- | --- | --- | --- | --- | --- |
| Authenticated new principal plus an organization invitation | 1, 3 | `INV-01`, `INV-02`, `INV-05` | Authentication alone reveals no operational data. Only a valid basis-specific activation Action may consume the invitation and create its exact membership. | Activation is limited to the invited organization and role; failure leaves `pending_activation` and creates remediation or support work. | Attempt, invitation basis, resulting access state, membership, actor, and correlation | `AUTH-COH-001` |
| Active principal plus an otherwise valid grant | 1, 3, 7 | `INV-02`, `INV-03`, `INV-05` | The grant is only potential authority; current state, scope, relationship, evidence, policy, object state, and time all still apply. | Denial identifies the failed condition and its owned next step without broadening another scope. | Decision basis and outcome | `AUTH-COH-002` |
| Global `restricted` state plus a scoped grant | 3, 4 | `INV-02`, `INV-03` | Global restriction denies ordinary operational use; only its reason-specific remediation allowlist remains. | Remediation submission cannot restore access or a grant; an authorized release review owns the next step. | Restriction, attempted Action, remediation/release outcome | `AUTH-COH-003` |
| Active principal plus a scoped restriction | 3, 7 | `INV-03`, `INV-05`, `INV-08` | Only the restricted scope is denied unless policy establishes a global state; unrelated valid scope is evaluated normally. | Release is a separate backend Action; serious restrictions do not auto-release. | Denial/release scope, reason, versions, and actor | `AUTH-COH-004` |
| Suspended principal plus active platform or organization grants | 2, 4, 7 | `INV-02`, `INV-09`, `INV-10` | Operational reads and Actions deny immediately from authoritative state; existing grants do not override suspension. | Safe self-notice and controlled recovery only; restoration names each authority component separately. | Suspension, denied attempts, recovery and separate restoration outcomes | `AUTH-COH-005` |
| Disabled principal plus recovery request | 4, 5 | `INV-02`, `INV-09`, `INV-15` | No ordinary authority path can restore the principal. Controlled recovery validates identity, policy, and current state. | Successful principal restoration does not restore prior grants, memberships, credentials, or sessions. | Recovery request, evidence class, decision, and component outcomes | `AUTH-COH-006` |
| One administrator suspects another is compromised | 2, 4, 7 | `INV-03`, `INV-07`, `INV-09` | One active administrator may apply only an immediate temporary emergency suspension; permanent action requires independent approval. | Independent reviewer must confirm, restore, request permanent revocation, or invoke controlled recovery within the policy window. | Requester, target, reason, evidence reference, deadline, reviewer, and outcome | `AUTH-COH-007` |
| Grant, permanent revocation, restoration, or scope change of `platform_admin` | 2, 7 | `INV-07`, `INV-08`, `INV-11` | Two distinct currently authorized humans approve; requester, target, and independent approver constraints are re-evaluated atomically. | Expired, stale-policy, self-approved, same-human, incompatible, or anti-lockout-violating requests deny with a new request/recovery next step. | Both actors, target, requested change, policy/version, evidence, and final result | `AUTH-COH-008` |
| Greenfield bootstrap or loss of ordinary administrator quorum | 5 | `INV-07`, `INV-11`, `INV-15` | Bootstrap is allowed only in a provably never-authorized environment; disaster recovery is separate and restores minimum safe quorum only. | Ambiguity, replay, wrong environment, prior authority, or partial consumption fails closed and creates owned recovery work. | Environment-bound manifest, dual custody, consumption ledgers, targets, and result | `AUTH-COH-009` |
| Existing administrator/manager migration versus bootstrap | 5, 6 | `INV-04`, `INV-11`, `INV-15` | Any current, historical, or ambiguous authority prohibits bootstrap. Only independently approved verified claims migrate. | Unsupported but needed access uses a new grant or recovery Action; unknown claims receive no effective authority. | Claim provenance, classification, approvers, disposition, manifest, and reconciliation | `AUTH-COH-010` |
| Authority expiration, extension, successor, or restoration | 2, 7 | `INV-08`, `INV-09`, `INV-10` | Expiration denies at the approved boundary; continuation is an approved version/successor and never rewrites history or backfills a gap. | Overdue reviews create owned work but no hidden grace; privileged renewal retains dual approval. | Prior term, new term or denial, times, policy, approvers, and linkage | `AUTH-COH-011` |
| Session, frontend snapshot, Realtime connection, or bearer artifact after authority loss | 1, 3, 4, 7 | `INV-04`, `INV-10`, `INV-14` | New backend reads/mutations deny from authoritative state. Connection and bearer residuals follow their explicitly classified containment contract. | Disconnect/short JWT expiry, stop issuance/refresh, bounded TTL/cache, and incident ownership apply; downloaded copies are residual exposure. | Authority end, invalidation/disconnect attempt, artifact issuance, residual window, and incident outcome | `AUTH-COH-012` |
| Authority mutation plus audit/outbox or notification failure | 1–7 | `INV-11`, `INV-12` | Mutation and domain audit/outbox commit together or roll back; post-commit delivery failure never changes authority. | Retry or owned operational work is the next step; no silent authority extension or rollback occurs. | Atomic event plus delivery/retry technical record | `AUTH-COH-013` |
| Service-role, security-definer, automation, or AI-proposed Action | 1–7 | `INV-04`, `INV-05`, `INV-06`, `INV-13` | Elevated execution context does not confer initiating-principal authority; the same object, scope, relationship, state, evidence, policy, and time checks apply. | Unauthorized or non-derivable identity/scope denies; automation/AI may propose but cannot approve or bypass. | Initiator, execution context class, target/scope, decision basis, and outcome | `AUTH-COH-014` |
| Human platform role or workload authority across grant, extension, migration, restoration, recovery, approval, and quorum paths | 2, 5, 6, 7 | `INV-04`, `INV-07`, `INV-09`, `INV-15`, `INV-16` | Human platform roles remain effective only for currently eligible human principals. Workload principals use separate scoped grants and never satisfy human authority, independence, approval, or quorum. | Invalid or lost classification/eligibility makes the human platform grant immediately ineffective and creates owned review; correction or revalidation transfers nothing and requires the correct Action. | Principal kind and evidence basis, eligibility result, human/workload owner, affected grants, denial/restoration outcome, and correlation | `AUTH-COH-015` |

## Bounded threat and abuse-case register

This register defines the minimum red-team boundary for ratification and later implementation planning. It is intentionally bounded; discovering a new material abuse path requires an amendment rather than an unlimited audit.

| Threat or failure | Controlling control | Expected result | Audit and recovery | Future test ID |
| --- | --- | --- | --- | --- |
| Compromised administrator grants or restores authority | Dual independent approval, current-state recheck, anti-self-elevation | One actor cannot complete the material change | Record request and denial; emergency containment and incident recovery | `AUTH-THR-001` |
| Malicious administrator suspends a peer | Temporary-only single-admin suspension plus independent deadline | Immediate containment is possible, but permanent removal or silent continuation is not | Urgent audit; independent confirm/restore/escalate | `AUTH-THR-002` |
| Same human uses two identities to simulate independence | Verified-human independence and conflict-of-control checks | Approval fails when independence cannot be proven | Record evidence conflict; route to controlled recovery | `AUTH-THR-003` |
| Stale JWT, route state, or frontend authority snapshot | Request-time authoritative evaluation | New protected backend operation denies | Security denial plus session invalidation/refresh path | `AUTH-THR-004` |
| Direct REST, RPC, table, service-role, or definer-function bypass | Exact grants, safe function baseline, internal authorization | Unapproved path denies and persists no change | Technical denial; investigate repeated attempts | `AUTH-THR-005` |
| Cross-organization identifier or acting-org tampering | Derived identity/scope, membership and relationship checks | Cross-tenant read or mutation denies without object disclosure | Security denial with minimized identifiers | `AUTH-THR-006` |
| Broadcast/Presence connection survives authority change | Mode-specific policy, active disconnect, bounded JWT lifetime | New subscriptions deny; existing connection is disconnected or bounded to documented expiry | Record authority end, disconnect attempt, and residual window | `AUTH-THR-007` |
| Signed URL or CDN cache survives suspension | Authorized issuance, bounded TTL plus `cacheControl`, revocable path for high-risk evidence | New issuance stops; residual bearer/cache access is bounded and disclosed | Issuance ledger, incident response, object rotation/deletion where appropriate | `AUTH-THR-008` |
| Offline or queued Action replays earlier authority | Server-execution recheck, idempotency, expected version | Uncommitted Action denies if current authority/state changed | Attempt/outcome audit and user-owned retry/remediation | `AUTH-THR-009` |
| Concurrent approvals, duplicate requests, or conflicting replay | Locks/version checks, idempotency key, one atomic winner | One compatible result; stale/conflicting attempts deny without partial effects | Correlated replay/concurrency outcomes | `AUTH-THR-010` |
| Bootstrap or migration targets wrong environment, replays, or partially applies | Environment-bound manifest, independent consumption ledger, fail-closed cutover | No privileged operation until state is unambiguous and reconciled | Both ledgers, recovery owner, forward correction only | `AUTH-THR-011` |
| Scheduler, cache, outbox, or notification delay crosses an authority boundary | Direct request-time enforcement and atomic mutation/audit/outbox | Delay creates no grace, grant, release, restoration, or revocation | Delivery failure/retry log and owned next step | `AUTH-THR-012` |
| PostgreSQL time snapshot is older than the final decision | One captured suitable current instant after locks; short final transaction | Authority expired before the captured decision denies | Decision instant and evaluated window in audit context | `AUTH-THR-013` |
| Unsafe definer `search_path` or broad execute grant | Schema-qualified resolution, revoked defaults, exact caller grants | Object-shadowing and unintended RPC execution fail | Deployment/static verification and runtime negative tests | `AUTH-THR-014` |
| Demo, seed, shared, service, AI, or unexplained historical identity gains human authority | Provenance inventory, explicit principal class, no convenience-source authority | Ambiguous/non-human claims create no human operational grant | Classification, denial, remediation or controlled new-grant process | `AUTH-THR-015` |
| Profile/auth metadata tampering, in-place reclassification, workload restoration, or delegated AI attempts to obtain or preserve human platform authority | Backend-controlled immutable principal kind, separate current eligibility, human-only platform-role guards, permission intersection, and immediate ineffectiveness on invalidity | Tampering changes no authority; reclassification transfers nothing; workload and AI-controlled execution cannot receive, restore, approve, extend, or preserve a human platform role | Record the rejected attempt or eligibility loss, make affected grants ineffective, preserve history, and route controlled identity correction, workload review, or human revalidation | `AUTH-THR-016` |

## Change control and supersession

After final ratification, the accepted baseline is immutable. A change to semantics, precedence, state meaning, authorization outcome, recovery, audit requirements, or an invariant requires a proposed amendment, affected-decision and threat analysis, coherence-matrix re-review, explicit product-owner approval, and a revision bump. The new accepted revision must name the exact revision it supersedes, and the superseded record must be retained.

Any proposed weakening of the dual-control, bootstrap/recovery, migration-provenance, deny-precedence, audit-atomicity, or fail-closed guarantees requires an independent qualified security review and explicit product-owner risk acceptance. The product owner remains the final business authority; a technical reviewer cannot silently replace product approval.

Emergency containment may temporarily restrict implementation behavior to reduce immediate risk, but it is not an architecture amendment and cannot broaden authority. It requires an urgent audit record, a named owner, an expiration/review condition, and retrospective review. A permanent doctrine change follows the ordinary amendment process.

## Non-normative primary validation references

These references validate platform behavior and engineering constraints; they do not delegate ALLRENTZ product decisions to a vendor or external framework.

- [PostgreSQL date/time functions](https://www.postgresql.org/docs/15/functions-datetime.html) — transaction-, statement-, and wall-clock semantics.
- [Supabase Realtime authorization](https://supabase.com/docs/guides/realtime/authorization) — connection-time authorization, JWT refresh/expiry, and Broadcast/Presence behavior.
- [Supabase Storage downloads](https://supabase.com/docs/guides/storage/serving/downloads) — signed-URL lifetime and signing-key behavior.
- [Supabase Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn) — cache behavior around signed URLs and object deletion.
- [Supabase database functions](https://supabase.com/docs/guides/database/functions) — invoker/definer behavior, `search_path`, and function execution grants.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — deny by default, every-request authorization, and relationship/context-aware decisions.
- [NIST SP 800-128](https://csrc.nist.gov/pubs/sp/800/128/upd1/final) — security-focused configuration and controlled change management.
- [AWS Architecture Decision Records best practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/best-practices.html) — immutable accepted decisions and explicit supersession.

## Ratification evidence record

| Gate | Result |
| --- | --- |
| Product-owner Decisions 1–7 | **APPROVED** |
| Internal decision coherence | **PASSED AT SPECIFICATION LEVEL** through `AUTH-COH-001`–`015` |
| Material external technical clarification | **INCORPORATED** for time semantics, Realtime, signed URLs/CDN, function security, residual exposure, and change control |
| Pre-ratification bounded review | **PASSED 2026-07-22**, including the targeted principal-class correction review |
| Current implementation inventory and verification | **NOT STARTED** |
| Stage 2A implementation plan | **NOT STARTED** |
| Schema/code/migration/production authorization | **NOT AUTHORIZED** |

## Product-owner decision status

| Decision | Status | Controlling outcome |
| --- | --- | --- |
| 1. New-principal default and activation | **APPROVED** | New principals begin at `pending_activation`; activation is basis-specific, backend-controlled, atomic, and audited, and never independently grants operational authority. |
| 2. `platform_admin` authority changes | **APPROVED** | Material administrator grants, permanent revocations, restorations, and scope changes require two independent authorized and currently eligible human principals; one eligible human administrator may apply only a temporary emergency suspension subject to independent eligible-human review. |
| 3. Restricted-state remediation | **APPROVED** | Global restriction permits only reason-specific remediation; narrower authority problems use scoped restrictions; remediation submission never restores authority. |
| 4. Suspended-principal visibility and recovery | **APPROVED** | Suspension denies operational access and permits only a fixed safe self-notice and controlled recovery path; restoration is separate and does not restore other authority. |
| 5. Bootstrap and disaster recovery | **APPROVED** | Greenfield bootstrap uses an external one-time ceremony for two independent verified humans, with dual-ledger consumption and no hidden root; disaster recovery is separate and restores only minimum safe quorum. |
| 6. Existing authority provenance and migration | **APPROVED** | Classify individual authority claims by evidence and disposition; migrate only independently approved verified claims through an environment-bound, restore-safe cutover; all ambiguous authority fails closed and bootstrap remains prohibited. |
| 7. Time-based authority windows and restoration | **APPROVED** | Time enforces pre-authorized windows but never invents, broadens, renews, or restores authority; expiration fails closed, serious restrictions require explicit restoration, and every release or successor remains backend-controlled and audited. |

All seven product-owner decisions are approved. The ALLRENTZ Product Owner ratified revision `1.0` as the controlling architecture baseline on 2026-07-22. Ratification authorizes bounded read-only inventory and implementation planning only; it does not authorize schema, code, migration, RLS, application, Supabase, deployment, production, or remote-system changes.

## Architecture acceptance rule

This specification was eligible for final ratification only after:

- all seven decisions were confirmed coherent under one bounded acceptance review;
- the invariant, coherence, and threat registers were confirmed to have no unresolved material contradiction or missing controlling outcome;
- the external technical clarifications in the candidate were confirmed under one bounded re-review;
- the product owner explicitly ratified the resulting controlled revision.

Ratification authorizes the next read-only inventory. A Stage 2 implementation plan may be accepted only when:

- current policy/RPC/Edge Function/frontend authority consumers are inventoried;
- each implementation stage has an exact authorized file and command boundary;
- the pre-fix reproduction and negative test matrix are approved;
- no implementation stage expands into the deferred lifecycle architecture;
- `MASTER_PRIORITY_BOARD.md` remains outside scope unless separately authorized.

The bounded candidate review and targeted principal-class correction review classified the seven approved product decisions as **COHERENT AT SPECIFICATION LEVEL**. The ALLRENTZ Product Owner has ratified revision `1.0` as the accepted architecture baseline for bounded inventory and implementation planning. No implementation is authorized by ratification. The current implementation decision is:

> **Stage 1 containment is verified. Stage 2 revision `1.0` is the ratified architecture baseline for bounded read-only inventory and implementation planning. No Stage 2 implementation is authorized. Blockers 2 and 3 remain open until separately approved implementation stages pass their complete verification contracts together.**
