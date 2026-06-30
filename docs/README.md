# ALLRENTZ Docs — Controlled Engineering Knowledge

**Status:** Active
**Authority:** Subordinate to `/ALLRENTZ_CONSTITUTION.md` and `/MASTER_PRIORITY_BOARD.md`
**Last reviewed:** 2026-06-29

This folder is the **controlled** documentation layer for the ALLRENTZ engineering source of truth. It is version-controlled in git alongside the code it describes.

---

## Two-tier knowledge model

There are two homes for ALLRENTZ knowledge. They are not interchangeable.

| Tier | Location | Role | Rules |
|---|---|---|---|
| **Raw archive** | OneDrive — `Documentos\ALLRENTZ`, `Documentos\Claude\Projects\ALLRENTZ – Marketplace Strategy & Development`, `Documentos\ALLRENTZ Enterprise Platform…` | Unfiltered history: every draft, audit, blueprint, pitch, `.docx`. Nothing is deleted. | Append-only. Never the source of truth. Not loaded into the repo. |
| **Controlled** | this repo — `allrentz-main/docs/` | Curated, current, authoritative engineering + product + strategy knowledge. Markdown only. | Single source of truth. Must not contradict the Constitution. Every file is indexed below. |

**Rule:** a document carries authority only if it lives here and is listed in this index. If it only exists in the OneDrive archive, it is reference material, not doctrine.

---

## Structure

```
docs/
  product/      How the platform behaves — lifecycle, workflows, test definitions
  engineering/  Build doctrine — authority order, verification, AI governance
  strategy/     Market positioning and competitive intelligence
  archive/      Migrated historical material kept for traceability
    lovable/    Lovable-era audits, fix plans, prompt lists
```

---

## Index

### product/
| File | Status | Source in raw archive |
|---|---|---|
| `rental-lifecycle-framework.md` | Draft — migrate | `Projects\…Strategy…\RENTAL_LIFECYCLE_FRAMEWORK.md` |
| `product-test.md` | Stub — needs input | unknown — Pat to confirm intended source |

### engineering/
| File | Status | Authority source |
|---|---|---|
| `authority-first-loop.md` | Draft | derives from `/ALLRENTZ_CONSTITUTION.md` (Operational Authority Order) |
| `p7-verify-doctrine.md` | Stub — needs input | relates to Constitution "Verification & Testing Authority" — Pat to confirm what "P7" denotes |
| `ai-governance.md` | Draft | derives from `/ALLRENTZ_CONSTITUTION.md` (AI Governance Rule) |

### strategy/
| File | Status | Source in raw archive |
|---|---|---|
| `market-positioning.md` | Draft — migrate | `Projects\…Strategy…\SOUL.md`, `…Strategic_Review_GamePlan_May2026.docx` |
| `competitor-notes.md` | Draft — migrate | `Projects\…Strategy…\ALLRENTZ_Competitor_Pass3_May2026.docx`; `Documentos\ALLRENTZ\New 9.3.2025\ALLRENTZ Competitor Synthesis and Action Plan.docx` |

### archive/lovable/
| File | Status | Source in raw archive |
|---|---|---|
| `gap-audit-may-2026.md` | Migrate | `…Strategy…\ALLRENTZ_LiveApp_GapAudit_May2026.docx` |
| `master-fix-plan-may-2026.md` | Migrate | `…Strategy…\ALLRENTZ_Lovable_MasterFixPlan_May2026.docx` |
| `prompt-master-list.md` | Migrate | `…Strategy…\ALLRENTZ_Lovable_Prompt_Master_List.md` |

---

## Working rules

1. **Markdown only.** The archive holds `.docx`. Controlled docs are `.md` so they diff, link, and version cleanly.
2. **No parallel doctrine.** If content is already owned by the Constitution or Priority Board, link to it — do not restate it here.
3. **Status is explicit.** Every file declares `status:` in frontmatter — `stub`, `draft`, or `active`.
4. **Migrate, then prune.** When a `.docx` is converted into a controlled doc, leave the original in the archive untouched and record the source pointer in this index.
5. **Index or it doesn't count.** New files must be added to the index above in the same change.
