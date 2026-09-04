---
title: ALLRENTZ Search-to-RFQ Operating Model
domain: product
lifecycle_status: active
governance_state: candidate
authorized_scope: product behavior and implementation planning for equipment search, RFQ structuring, vendor matching, controlled routing, quote response, comparison, customer selection, and Operations exception handling only; no schema, RLS, command, contractual, billing, deployment, or production authority
authorization_reference: Patrick McGriff, approved product direction, 2026-09-03
authority: subordinate to /ALLRENTZ_CONSTITUTION.md and docs/doctrine/ALLRENTZ_ARCHITECTURAL_FOUNDATION.md
related: docs/product/rental-lifecycle-framework.md
last_reviewed: 2026-09-03
---

# ALLRENTZ Search-to-RFQ Operating Model

## Operating rule

ALLRENTZ must be search-first and execution-fast.

Search or describe the need → ALLRENTZ structures and validates the RFQ automatically → matched and eligible vendors are identified → the customer selects vendors or an approved routing policy sends the RFQ immediately → vendors confirm availability and quote → the customer compares and selects responses → ALLRENTZ continues the governed rental workflow → Operations intervenes only when there is a real exception.

The normal customer workflow must move in seconds. It must not depend on an ALLRENTZ employee reviewing and cleaning up every request.

The operating principle is:

**Search first. Instant RFQ second. Operations only by exception.**

## Customer entry modes

A customer must be able to begin in three ways.

### 1. Standard equipment search

The customer searches by equipment category, class, specification, location, required dates, and rental duration.

Common categories may include:

- Dozers
- Excavators
- Forklifts
- Telehandlers
- Scissor lifts
- Boom lifts
- Compressors
- Generators
- Pumps
- Light towers
- Small tools

The intended workflow is:

Equipment category → size or specification → location → dates → eligible vendor options → send RFQ

Standard equipment sourcing must be fast, structured, and searchable.

### 2. Multi-item rental package

A customer must be able to create one RFQ containing multiple equipment lines for a shared project, location, and rental period.

For example:

> Diesel air compressors, blast pots, light towers, manlifts, and small air tools for a 14-day refinery job in Beaumont.

ALLRENTZ must convert this request into a structured package containing each equipment line together with the shared project information, dates, delivery requirements, and site conditions.

The customer must not be required to create separate, unrelated RFQs for each item.

### 3. Specialized or hard-to-source request

For unusual, industrial-specific, or difficult-to-source requirements, the customer must be able to describe the need in normal language.

ALLRENTZ must:

1. Extract the equipment requirements and job conditions.
2. Convert them into structured RFQ line items.
3. Identify matched and eligible vendors.
4. Route the RFQ immediately when classification confidence is sufficient.
5. Escalate only requests that cannot be classified or routed reliably.

ALLRENTZ may classify and structure only from facts provided by the customer or an approved source. It must not invent equipment specifications, quantities, dates, site conditions, compliance requirements, or commercial terms.

Any material inferred field must be clearly identified and confirmed by the customer before routing. Unknown information remains unknown.

## Automatic RFQ structuring

ALLRENTZ must convert customer input into structured equipment line items containing, as applicable:

- Equipment category
- Required size, class, capacity, or performance specifications
- Quantity
- Delivery location
- Required date and time
- Estimated rental duration
- Delivery and pickup requirements
- Relevant site and job requirements
- Required documents or compliance conditions already known to the customer

The resulting RFQ must preserve the customer’s stated facts, confirmed structured fields, unresolved unknowns, and referenced source material.

## Minimum quote-ready validation

Validation must require minimum quote-ready completeness, not perfect project completeness.

Only information required for a vendor to identify the requested equipment, price the request, and confirm potential availability may block initial RFQ routing.

Compliance documents, final site-access requirements, onboarding records, and dispatch prerequisites may be completed later unless an approved customer, site, disclosure, or routing policy requires them before routing.

A complete and properly classified request continues immediately. Routine Operations review is not required.

An exception is created when:

- Information required for a usable vendor response is missing.
- Material specifications conflict.
- A material inferred value has not been confirmed.
- Classification confidence is insufficient.
- A governing customer, site, disclosure, or routing requirement has not been satisfied.

Validation must protect RFQ usefulness without turning the intake process into a mandatory pre-execution project review.

## Vendor matching terminology

The platform must use precise vendor terminology:

- **Matched vendor:** A vendor that meets the available matching criteria, such as equipment category, geography, known capability, and account rules.
- **Eligible vendor:** A matched vendor that is permitted to receive the RFQ under the applicable customer, disclosure, and routing rules.
- **Verified qualified vendor:** A vendor for which all qualification controls required for the relevant action have been confirmed.
- **Vendor-confirmed availability:** A vendor that has affirmatively confirmed the requested equipment and timing.

A matched vendor must not be described as eligible, verified qualified, or available unless the requirements for that state have been satisfied.

## Controlled vendor routing

ALLRENTZ may evaluate vendors using:

- Equipment category and known capability
- Service geography
- Customer-approved vendor rules
- Known site, safety, insurance, and compliance status
- Prior response and fulfillment performance
- Supplier, branch, or inventory signals
- Required rental timing and service conditions
- Vendor suspension, exclusion, and disqualification status
- Other approved matching rules

The customer controls routing through either:

- Direct selection of eligible vendors; or
- A previously approved automatic routing policy.

A routing policy may require verified qualification before an RFQ is delivered. Where it does not, later qualification requirements must remain visible and must be completed before the action they control.

Automatic routing must be fast but controlled. An RFQ may be routed only to eligible vendors that are permitted to receive the customer’s information and fall within the approved recipient limit.

The system must not broadcast plant names, project details, schedules, pricing information, or customer requirements to an uncontrolled vendor population.

## Vendor responses

ALLRENTZ must generate and send the structured RFQ in seconds once its validation and routing requirements are satisfied.

A vendor may quote the entire package or only the equipment lines it can supply.

Every response must identify:

- Quoted lines
- Declined lines
- Substitutions
- Deviations from the request
- Quantities
- Equipment class or model offered
- Availability status
- Daily, weekly, and monthly rates
- Delivery and pickup charges
- Fees and taxes
- Rental terms
- Exclusions
- Required documents
- Estimated delivery timing
- Quote expiration

Each required response field must contain either a value or an explicit status such as:

- Included
- Not included
- Not offered
- Not applicable
- Estimated
- To be confirmed
- Unknown

A blank field must never be interpreted as zero cost, included in the quoted rate, accepted without exception, or not applicable.

ALLRENTZ must support package-level and line-level comparison.

Any split-award authority remains subject to the approved award and Rental Order model. Supporting partial-line responses does not itself authorize a split award.

## Availability and commitment states

The following states represent different facts and must not be used interchangeably:

| State | Meaning |
|---|---|
| Eligible matched vendor | The vendor meets the available category, geography, capability, customer, and routing criteria. This is not an availability commitment. |
| Availability signal | A recent supplier, inventory, branch, or response signal indicates that equipment may be available. It is not binding. |
| Vendor-confirmed availability | The vendor has affirmatively confirmed the requested equipment, location, dates, specifications, and conditions. |
| Customer award | The customer has selected or accepted the vendor response under the approved award workflow. |
| Reservation | The vendor has accepted an authorized reservation under defined terms. |
| Governed Rental Order | The accepted transaction has been converted into the authoritative commercial and operational record. |

A customer award does not by itself prove that equipment is reserved, dispatched, or contractually committed unless the governing terms and authoritative workflow establish that result.

The interface, workflow, and audit history must preserve these distinctions.

Each availability and commitment state must be attached to the exact scope supported by the underlying evidence, such as an RFQ line, quoted quantity, package, award, reservation, or Rental Order.

For a multi-item RFQ:

- Line-level availability must not be represented as package-level availability.
- A partial-line vendor response must not make the full package appear covered.
- A line-level award or reservation must not be represented as a package-level award or reservation.
- Package-level status may be shown only when every required line satisfies the applicable package condition.
- Partial coverage, substitutions, declined lines, and unresolved gaps must remain visible.

## RFQ versus booking

For the initial Search-to-RFQ capability, ALLRENTZ must promise instant sourcing execution, not universal instant booking.

The platform may immediately:

- Create a structured RFQ.
- Match vendors.
- Determine routing eligibility.
- Route the RFQ.
- Collect comparable full-package and partial-line responses.
- Record vendor-confirmed availability.
- Allow the customer to compare and select responses under the approved award workflow.

The product may display **Request Reservation** when:

- The vendor supports reservations.
- Equipment availability has been confirmed for the applicable scope.
- Pricing and commercial terms are defined.
- The customer has authority to proceed.

Where vendor acceptance is not immediate, the resulting state must remain **Pending Vendor Confirmation**.

The product may display **Book** only when an approved vendor integration or authoritative workflow can confirm and record the reservation as part of the same transaction.

The product may display **Reserved** or **Booked** only after:

- The vendor has accepted the reservation.
- The applicable equipment, quantities, dates, location, pricing, and terms are identified.
- The reservation has been recorded through an authoritative transaction under the approved award and Rental Order model.

Customer selection or award does not by itself establish a reservation.

Until the applicable reservation conditions are satisfied, the correct customer action is:

**Send RFQ**

The product must not represent an RFQ, customer selection, or pending reservation request as **Book now**, **Reserved**, or **Booked**.

## Connected rental execution

ALLRENTZ does not stop when a response is selected. The rental remains connected through the broader governed workflow, including:

- Award and commercial terms
- Governed Rental Order creation
- Documents and approvals
- Dispatch and delivery coordination
- On-rent activation
- Extensions and changes
- Off-rent request
- Pickup and return coordination
- Invoice support
- Change history
- Disputes and audit history
- Vendor performance

Search is the entry point. Governed rental execution is the product.

This operating model does not independently define the authority, state transitions, evidence requirements, or commercial consequences governing those later lifecycle stages.

## Operations exception model

Operations is a control, support, and exception-handling layer. It is not a mandatory gate in the normal RFQ workflow.

Operations intervenes when:

- Quote-ready information is missing.
- Classification confidence is insufficient.
- Material specifications conflict.
- Required customer confirmation is missing.
- No eligible vendor is found.
- Qualification cannot be confirmed when a policy requires it before routing.
- The customer requests assistance.
- The request falls outside approved customer, disclosure, or routing rules.
- Site, safety, insurance, or compliance conditions require review.
- Vendor response is inadequate.
- Routing or workflow execution fails.
- A dispute, exception, or high-risk condition requires human judgment.

Urgency or dollar value alone must not force manual review. A complete, standard, high-value request with eligible vendors must still move immediately.

Operations must have authorized control-tower visibility into:

- Failed validation
- Low-confidence classification
- Missing eligible-vendor coverage
- RFQs receiving no response
- Vendor declines
- Partial-package coverage gaps
- Expired quote windows
- Compliance exceptions
- Delivery and pickup exceptions
- Customer-requested support
- System and workflow failures

Operations manages exceptions. It does not manually carry every transaction.

## Product differentiation

ALLRENTZ is not merely an equipment listing site, quote inbox, or national rental broker.

It is the customer-controlled execution and accountability layer across multiple rental vendors, industrial sites, Rental Orders, documents, dispatch, on-rent, off-rent, changes, invoices, disputes, and vendor performance.

Its differentiation includes:

- Customer-controlled vendor networks
- Industrial and site-specific requirements
- Standard, specialized, and multi-item sourcing
- Full-package and partial-line vendor participation
- Comparable vendor responses
- Controlled selection and commercial terms
- Documents and approvals
- Dispatch and delivery coordination
- On-rent and off-rent accountability
- Extensions and change control
- Pickup and return visibility
- Invoice support and correction history
- Cross-vendor reporting
- Audit history
- Vendor performance data

## Minimum credible Search-to-RFQ slice

This section defines the minimum credible Search-to-RFQ capability. It does not replace the broader ALLRENTZ MVP, lifecycle, Rental Order, security, authority, or operational-execution requirements defined elsewhere.

The minimum credible slice includes:

1. Searchable equipment categories and specifications.
2. Standard, multi-item, and specialized-request entry modes.
3. Automatic RFQ structuring without invented facts.
4. Minimum quote-ready validation.
5. Customer-controlled vendor selection.
6. Controlled automatic routing.
7. Full-package and partial-line vendor responses.
8. Vendor availability confirmation.
9. Package-level and line-level comparison.
10. Customer response selection under the approved award workflow.
11. An Operations exception queue.
12. Status and audit visibility for the sourcing workflow.

This slice must not claim universal real-time inventory, guaranteed availability, instant reservation, or instant booking unless those capabilities are supported by verified vendor integrations and authoritative transactions.
