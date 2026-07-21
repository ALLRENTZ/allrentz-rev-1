# GOVERNANCE

Read ALLRENTZ_CONSTITUTION.md before performing any planning, architecture, implementation, migration, schema modification, workflow change, SmartMatch work, compliance logic, or AI-related work.

All implementation decisions must follow the operational authority order defined in the constitution.

Do not expand scope sideways.
Do not prioritize features over operational authority.
Do not introduce architecture that bypasses backend authority, auditability, migration integrity, or workflow enforcement.

## High-Control Agent Governance

Full doctrine: `docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md`.

Claude's authority is scoped by action type, context, and approval level, not by confidence. Before any high-risk or production-impacting action, Claude must classify it as **Allow**, **Warn**, **Block**, or **Human Review Required**.

Claude must stop for human approval before changing auth, RLS, migrations, payment logic, admin override behavior, customer/vendor authority, audit logs, CI gates, secrets, live data, production behavior, or deployment state.

Fresh evidence beats old memory. Current code, schema, policies, tests, logs, and production behavior override stale notes every time.

AI may recommend. Tests verify. Database authority decides. State contracts enforce. Humans approve high-risk changes.

# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

---

## Current Phase: MVP Trust Hardening + Operational Stabilization

**Read `MASTER_PRIORITY_BOARD.md` before proposing or starting any work.**

Current objective: stabilize the platform, remove trust-breaking behavior, improve workflow continuity, and create a believable operational demo environment before major feature expansion.

Current focus:
- Trust (no fake metrics, fake pricing, fake availability, fake AI claims)
- Workflow continuity
- Operational clarity
- Realistic platform behavior

NOT current focus:
- Advanced AI architecture
- Autonomous agents
- Enterprise integrations
- Full-scale marketplace automation
- Redesigning the platform

### SmartMatch — Current State

SmartMatch is currently a **workflow and demo system**, not a production AI orchestration engine. It filters a set of mock vendor records based on user inputs. Real vendor matching from the database has not been built yet. Do not describe it as AI-powered, do not add AI capability claims, and do not build real vendor queries until that work is explicitly approved.

### Current Working Workflow

Every fix follows this sequence:
1. Audit the specific file or issue — explain what is wrong and why
2. Propose the minimal fix — wait for approval
3. Apply only the approved changes
4. Show git diff
5. Commit
6. Update `MASTER_PRIORITY_BOARD.md` — mark completed task `[x]`, append `<!-- commitHash -->` on that line only

---

## Core Operating Rules

1. **Think before coding.**
   Before making changes, understand the request, inspect the relevant files, and explain the intended approach when the task affects multiple files or core logic.

2. **Prioritize simplicity.**
   Use the smallest clear change that solves the task. Avoid unnecessary abstractions, wrappers, helpers, services, try/catch blocks, or extra files.

3. **Make surgical edits.**
   Do not rewrite working code unless explicitly asked. Preserve the existing structure, style, architecture, naming, and file organization.

4. **Focus on testable goals.**
   Every task should have a clear outcome that can be checked by running, viewing, testing, or inspecting the result.

---

## Project Context

ALLRENTZ is an industrial equipment rental platform for refineries, terminals, contractors, and rental vendors.

Operational accuracy matters more than generic SaaS patterns.

The platform must support:
- Customer rental requests
- Vendor equipment listings
- Quote generation
- Compliance tracking
- Delivery status
- Low-tech field users
- Mobile-first workflows
- Manual overrides when field conditions change

The goal is a **believable operational MVP** for refinery and terminal equipment workflows — not a polished consumer app, not an enterprise SaaS demo.

---

## Stack Rules

- Use the existing project stack and file structure.
- Follow existing naming conventions.
- Use TypeScript types where appropriate.
- Reuse existing components before creating new ones.
- Keep UI consistent with existing Tailwind and shadcn patterns.
- Do not introduce a new design system.
- Do not install packages unless explicitly approved.
- Do not modify config files unless explicitly asked.
- Do not touch .env files.
- Do not change authentication, database, or payment logic unless specifically instructed.

---

## Operational Rules

- Do not invent refinery, terminal, rental, compliance, delivery, or turnaround workflows.
- Do not assume business rules.
- Do not remove manual workflow options.
- Do not replace operational flexibility with rigid automation.
- Do not add fake AI functionality, fake metrics, fake pricing, or fake availability claims.
- When workflow logic is unclear, ask before implementing.
- Preserve field usability over technical elegance.
- Optimize workflows for operational scanning speed.
- Do not hide important operational information behind excessive clicks, tabs, or animations.

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

---

## Architecture Overview

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with custom ALLRENTZ brand colors (`allrentz-red` #DC2626, `allrentz-gray` #374151)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v6

### Application Structure

- `src/pages/` — Route-level page components (one per route)
- `src/components/` — Shared and reusable components
- `src/components/ui/` — shadcn/ui primitives (auto-generated, do not edit directly)
- `src/services/` — Business logic services
- `src/data/` — Static/seed data files (currently used for demo content)
- `src/contexts/` — React context providers (Auth, etc.)
- `src/integrations/supabase/` — Supabase client and generated types

### Key Architectural Patterns

1. **Multi-role authentication** — `customer`, `vendor`, `admin`, `manager` via Supabase Auth + `profiles` table. Managed in `src/contexts/AuthContext.tsx`.
2. **Page-based routing** — All routes defined in `src/App.tsx`. Pages are self-contained; delegate logic to components.
3. **Service layer** — Business logic in `src/services/`. Components should not call Supabase directly where a service exists.
4. **Static seed data** — `src/data/featuredEquipment.ts` and `src/data/equipmentCategories.ts` contain placeholder content. These are not live database queries.

### Supabase Tables Currently in Use

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles and role assignments |
| `notifications` | Customer notifications |
| `rental_requests` | Quote and rental request records |
| `smart_match_requests` | SmartMatch session records |
| `smart_draft_quotes` | SmartDraft quote records |

Supabase types in `src/integrations/supabase/types.ts` are auto-generated. Do not edit directly. Run `supabase gen types typescript` to regenerate after schema changes.

---

## Naming Conventions

### Files and Directories
- **Components**: PascalCase (`SmartMatchInterface.tsx`)
- **Pages**: PascalCase (`CustomerDashboard.tsx`)
- **Services**: camelCase (`smartMatchEngine.ts`)
- **Utilities**: camelCase (`imageUtils.ts`)

### React Components
- Functional components only — no class components
- Props interfaces: `ComponentNameProps`
- Event handlers: `handleActionName`
- State variables: descriptive names (`isLoading`, `matchResults`, `selectedEquipment`)

### CSS
- Tailwind only — no custom CSS unless absolutely necessary
- Brand colors: `allrentz-red`, `allrentz-gray` variants
- Industrial theme: consistent with existing heavy machinery aesthetic

---

## File Organization Rules

| What | Where |
|------|-------|
| New pages | `src/pages/` — must be added to `src/App.tsx` routing |
| New shared components | `src/components/` |
| New business logic | `src/services/` |
| New utilities | `src/lib/` (pure functions only) |
| New types | Inline in service or component file unless widely shared |

---

## Industrial Equipment Domain Knowledge

### Equipment Categories
- Steam Boilers, Frac Tanks, Safety Equipment, Pressure Vessels, Heavy Machinery, Power Generation
- Turnaround & Shutdown essentials, Inspection & Compliance gear, Welding & Fabrication tooling

### Common Certifications
- **TWIC**: Transportation Worker Identification Credential
- **HAZMAT**: Hazardous materials handling
- **ISNET**: Industrial Safety Network
- **API Standards**: American Petroleum Institute certifications
- **PEC SafeLand**: Petrochemical safety training
- **ASME**: Pressure vessel and piping standards
- **OSHA-30**: Construction/general industry safety

### Primary Geographic Markets
Houston, Beaumont, Port Arthur, Corpus Christi, Galveston — Gulf Coast refineries and petrochemical complexes.

### Delivery Constraints
Site access requirements, TWIC gate access, security clearances, timing windows around unit operations.

---

## Never Do

- Do not refactor unrelated files.
- Do not rename files unless asked.
- Do not change database schema without approval.
- Do not modify authentication without approval.
- Do not modify payment logic without approval.
- Do not install new packages without approval.
- Do not create unnecessary helper files.
- Do not rewrite working components just to improve style.
- Do not make broad changes from vague requests.
- Do not add fake metrics, fake pricing, fake availability, or fake AI capability claims.
- Do not add `as any` TypeScript casts without flagging them as technical debt.
- Do not silently fall back to mock/demo data for authenticated users.

---

## Before Major Changes

Before making architectural changes, explain:
1. What will change
2. Why it is needed
3. What files will be affected
4. What risk it creates

Wait for approval before proceeding.

---

## Output Format Rules

Use markdown for:
- Technical explanations
- Debugging notes
- Architecture notes
- Implementation details
- Simple task summaries

Use self-contained HTML files for:
- Visual plans
- Workflow diagrams
- Quote comparisons
- Vendor comparisons
- Equipment listings
- Delivery status boards
- Compliance reports
- Executive reports
- Customer-facing summaries

HTML requirements:
- Single file only
- Inline CSS and JS
- No build step, no external dependencies
- Opens directly in a browser
- Mobile responsive
- Printable when useful
- Use SVG for diagrams instead of ASCII
- Optimize for operational scanning speed

Prefer operational clarity over visual flair. Avoid excessive animation, decorative UI, or unnecessary complexity.

---

## Good Tasks

**Good:**
"Add a vendor status filter to the existing equipment table. Use current styling. Do not change database schema."

**Good:**
"Create a mobile version of the delivery check-in screen using existing components."

**Good:**
"Audit `src/components/X.tsx` for fake data or trust issues. Do not edit yet."

**Bad:**
"Improve the platform."

**Bad:**
"Make the app more scalable."

**Bad:**
"Refactor the dashboard."
