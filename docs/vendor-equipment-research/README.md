# Vendor Equipment Research Library

## Purpose

This folder is the research layer for studying how industrial rental and equipment vendors organize, describe, categorize, and document their equipment online.

The goal is not to copy one vendor's catalog directly into ALLRENTZ. The goal is to compare multiple vendor platforms first, identify the strongest patterns, and then decide what information and structure ALLRENTZ should adopt.

## Operating Rule

Research first. Compare second. Approve the common model third. Connect production ingestion only after review.

No vendor capture in this folder should be treated as production inventory, live availability, pricing, or an approved ALLRENTZ schema.

## Standard Vendor Folder

Each vendor should receive its own folder containing:

- `README.md` — how the vendor lays out its catalog and product pages
- `field-map.json` — source fields and where they appear on the vendor platform
- `normalized-sample.json` — representative records translated into a comparison format
- `raw/` — raw exports or HTML captures when available
- `screenshots/` — visual examples when needed
- `review.md` — what ALLRENTZ should keep, reject, or improve

## Research Status

Use these stages for every vendor:

1. `CAPTURED` — raw pages or exports saved
2. `MAPPED` — visible fields and layout documented
3. `COMPARED` — reviewed against other vendors
4. `APPROVED` — fields and patterns selected for ALLRENTZ
5. `IMPLEMENTED` — approved mapping connected to the system

## Cross-Vendor Comparison Areas

Review each vendor for:

- Category and subcategory structure
- Equipment naming conventions
- Capacity, size, model, and specification formatting
- Product images and galleries
- Features, applications, and use cases
- Accessories and related equipment
- Downloads, manuals, certificates, and technical documents
- Location, availability, delivery, and service-area information
- Pricing, quote, reservation, and RFQ calls to action
- Search, filtering, sorting, and comparison behavior
- Product-detail URL structure and identifiers
- Information shown on listing cards versus full product pages

## Current Vendors

- Rain for Rent — tank and box catalog capture in progress
