# ALLRENTZ Docs — Controlled Engineering Knowledge

**Status:** Active
**Authority:** Subordinate to `/ALLRENTZ_CONSTITUTION.md`; governed by the precedence contract below
**Last reviewed:** 2026-07-23

This folder is the **controlled** documentation layer for the ALLRENTZ engineering source of truth. It is version-controlled in git alongside the code it describes.

---

## Two-home, three-class knowledge model

There are two storage homes and three authority classes for ALLRENTZ knowledge. They are not interchangeable.

| Class | Location | Role | Rules |
|---|---|---|---|
| **Raw archive** | OneDrive — `Documentos\ALLRENTZ`, `Documentos\Claude\Projects\ALLRENTZ – Marketplace Strategy & Development`, `Documentos\ALLRENTZ Enterprise Platform…` | Unfiltered history: every draft, audit, blueprint, pitch, `.docx`. Nothing is deleted. | Append-only. Never the source of truth. Not loaded into the repo. |
| **Controlled current** | this repo — `allrentz-main/docs/`, excluding `docs/archive/` | Curated doctrine, architecture, specifications, and current product, engineering, and strategy references. Markdown only. | Authority depends on the document's declared governance state and the precedence contract below. Candidates and drafts remain controlled but non-binding. Every file is indexed. |
| **Controlled non-authoritative archive** | this repo — `allrentz-main/docs/archive/` | Migrated historical material retained for traceability and comparison. | Indexed and version-controlled, but never current doctrine, architecture, implementation authority, or product truth. |

**Rule:** repository location and indexing are necessary for controlled authority, but they are not sufficient. A document carries authority only to the extent granted by its declared governance state and the precedence contract below. Files in either archive remain non-authoritative.

## Authority precedence

When controlled documents conflict, use this order:

1. `/ALLRENTZ_CONSTITUTION.md`;
2. controlling active doctrine, including `docs/doctrine/ALLRENTZ_ARCHITECTURAL_FOUNDATION.md`;
3. ratified architecture specifications within their approved domain;
4. approved implementation specifications within their exact authorized scope;
5. active product, engineering, and strategy reference documents;
6. `/MASTER_PRIORITY_BOARD.md` for approved execution sequence and status only;
7. drafts and candidates; and
8. controlled or raw archive material.

`/MASTER_PRIORITY_BOARD.md` controls approved execution priority and status. It cannot amend or override the Constitution, controlling doctrine, ratified architecture, or an approved security invariant. A lower-precedence document must be corrected when it conflicts with a higher-precedence source.

---

## Structure

```
docs/
  doctrine/     Governance that binds the agent (Claude) and the build process
  product/      How the platform behaves — lifecycle, workflows, test definitions
  engineering/  Build doctrine — authority order, verification, AI governance
  strategy/     Market positioning and competitive intelligence
  archive/      Migrated historical material kept for traceability
    lovable/    Lovable-era audits, fix plans, prompt lists
```

---

## Index

### doctrine/
| File | Status | Authority source |
|---|---|---|
| `ALLRENTZ_ARCHITECTURAL_FOUNDATION.md` | Active | subordinate to `/ALLRENTZ_CONSTITUTION.md`; controls product and engineering implementation decisions |
| `ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md` | Active | subordinate to `/ALLRENTZ_CONSTITUTION.md`; referenced from `/CLAUDE.md` |

### product/
| File | Status | Source in raw archive |
|---|---|---|
| `rental-lifecycle-framework.md` | Draft — migrate | `Projects\…Strategy…\RENTAL_LIFECYCLE_FRAMEWORK.md` |
| `product-test.md` | Stub — needs input | unknown — Pat to confirm intended source |

### engineering/
| File | Status | Authority source |
|---|---|---|
| `authority-first-loop.md` | Draft | derives from `/ALLRENTZ_CONSTITUTION.md` (Operational Authority Order) |
| `p7-verify-doctrine.md` | Draft | derives from `/ALLRENTZ_CONSTITUTION.md` (Formal Workflow Safety and Advanced Verification Doctrine) — P7 = P7-VERIFY harness workstream |
| `ai-governance.md` | Draft | derives from `/ALLRENTZ_CONSTITUTION.md` (AI Governance Rule) |
| `stage-2-authority-architecture-specification.md` | Active / Ratified v1.0 — bounded inventory/planning only; implementation separately authorized | derives from `docs/doctrine/ALLRENTZ_ARCHITECTURAL_FOUNDATION.md` and verified Stage 1 containment |
| `stage-2i-stage-2a-principal-authority-implementation-specification.md` | Active / Approved v0.2 — Stage 2I/2A implementation-planning baseline; no implementation authorized | implements the ratified `ALLRENTZ-AUTH-001` architecture without superseding it |

### strategy/
| File | Status | Source in raw archive |
|---|---|---|
| `market-positioning.md` | Draft — migrate | `Projects\…Strategy…\SOUL.md`, `…Strategic_Review_GamePlan_May2026.docx` |
| `competitor-notes.md` | Draft — migrate | `Projects\…Strategy…\ALLRENTZ_Competitor_Pass3_May2026.docx`; `Documentos\ALLRENTZ\New 9.3.2025\ALLRENTZ Competitor Synthesis and Action Plan.docx` |

### archive/lovable/
| File | Status | Source in raw archive |
|---|---|---|
| `gap-audit-may-2026.md` | Archived / Non-authoritative / Migrate | `…Strategy…\ALLRENTZ_LiveApp_GapAudit_May2026.docx` |
| `master-fix-plan-may-2026.md` | Archived / Non-authoritative / Migrate | `…Strategy…\ALLRENTZ_Lovable_MasterFixPlan_May2026.docx` |
| `prompt-master-list.md` | Archived / Non-authoritative / Migrate | `…Strategy…\ALLRENTZ_Lovable_Prompt_Master_List.md` |

---

## Working rules

1. **Markdown only.** The archive holds `.docx`. Controlled docs are `.md` so they diff, link, and version cleanly.
2. **No parallel doctrine.** If content is already owned by the Constitution, controlling doctrine, or a ratified architecture specification, link to it—do not create a competing rule. Link to the Priority Board for sequence and execution status only.
3. **Lifecycle, governance, and authorization are separate.** New or materially updated formal specifications declare:
   - `lifecycle_status`: `stub`, `draft`, `active`, or `archived`;
   - `governance_state`: `unreviewed`, `candidate`, `approved`, `ratified`, or `superseded`;
   - `authorized_scope`: an exact list or `none`; and
   - `authorization_reference`: the approving record or `none`.

   Authorization is never inferred from `active`, `approved`, or `ratified`. Legacy documents with a combined `status` field remain explicitly classified in this index until separately normalized; that compatibility does not increase their authority.
4. **Migrate, then prune.** When a `.docx` is converted into a controlled doc, leave the original in the archive untouched and record the source pointer in this index.
5. **Index or it doesn't count.** New files must be added to the index above in the same change.
