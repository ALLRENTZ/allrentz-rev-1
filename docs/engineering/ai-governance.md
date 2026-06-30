---
title: AI Governance
domain: engineering
status: draft
authority: subordinate to /ALLRENTZ_CONSTITUTION.md
source: derived from /ALLRENTZ_CONSTITUTION.md (AI Governance Rule); OneDrive\Documentos\ALLRENTZ\Why ALLRENTZ Needs Agentic AI.docx; ALLRENTZ AI DEPLOYMENT BLUEPRINT - MVP - BEYOND.docx
last_reviewed: 2026-06-29
---

# AI Governance

AI is **layer 10** of the operational authority order — the last layer, never the first. This file expands the Constitution's AI Governance Rule into engineering practice. The doctrine is owned by `/ALLRENTZ_CONSTITUTION.md`.

## Non-negotiable rules (from the Constitution)

- AI outputs are **never authoritative by default**.
- AI-generated recommendations, SmartMatch suggestions, workflow proposals, and operational insights must pass through authoritative workflow validation before becoming operational truth.
- AI may assist operations. AI may not define operational truth.
- All AI-assisted actions must be logged as **non-authoritative events**.

## Engineering implications

- SmartMatch and any model output write to a non-authoritative surface; a human or server-side authority action promotes it to operational state.
- No AI path may bypass the transition gate (`transition_rfq_status()`) or RLS.
- AI features ship only after the layers below them (1–9) are stable per the Scope Discipline Rule.

## Current posture (from Priority Board)

Advanced AI architecture, autonomous agents, and orchestration are explicitly **not** the current focus. Present work is trust hardening and operational stabilization. Honest AI wording only — no misleading AI claims.

## Migration pending

Strategic rationale for the eventual agentic layer lives in the raw archive (`Why ALLRENTZ Needs Agentic AI.docx`, `ALLRENTZ AI DEPLOYMENT BLUEPRINT.docx`). Migrate the durable parts here when the AI layer becomes active scope.
