# Rain for Rent Equipment Catalog Research

## Research Objective

Document how Rain for Rent presents tank and box equipment so its structure can be compared with other industrial rental vendors before ALLRENTZ adopts any final catalog or ingestion model.

## Current Status

`MAPPED`

The tank and box listing export has been captured and 12 product cards have been tested. This is still research and prototype work. It is not connected to live Rain for Rent requests and is not production inventory.

## Listing Card Structure

Each product is presented inside an `e-loop-item` card. The captured cards expose:

- Equipment name
- Capacity
- Equipment type
- Product image
- Product-detail URL

The listing does not show pricing, branch availability, delivery timing, or live inventory.

## Observed Presentation Pattern

- Equipment name is the primary heading and links to the detail page.
- Capacity is displayed as a labeled value and may include commas and units.
- Type is displayed separately from the product name.
- Images use lazy loading through `data-src` with a placeholder in `src`.
- Product URLs use a readable equipment slug.
- Similar products are separated by material, coating, tank configuration, or operating feature.

## Captured Examples

- Flat Top Smooth Wall Tank
- Flat Top Corrugated Wall Tank
- Flat Top Coated Steel Tank
- Bi-Level Tank
- Bi-Level Coated Steel Tank
- Steel Potable Water Storage Tank
- Open-Top Mini Weir Steel Tank
- 6300 Gal Poly Roll-Off Tank
- Stainless Steel Frac Tank
- Flip Top Tank
- Flip Top Coated Steel Tank
- 5HP Mixer Tank

## Files Already in the Project

- Raw 12-card fixture: `src/test/fixtures/rainforrent-tank-box-raw.json`
- Prototype adapter: `src/adapters/rainForRentAdapter.ts`
- Fixture tests: `src/adapters/rainForRentAdapter.test.ts`

## What ALLRENTZ Should Review Later

Rain for Rent should be compared with other vendors before deciding:

- Whether capacity belongs in the equipment name, a separate field, or both
- Whether vendor-specific type labels map to ALLRENTZ categories, attributes, or variants
- How coated, stainless, potable, mixer, and flip-top configurations should be modeled
- Which detail-page specifications should become searchable filters
- Whether product families should have one parent record with variants or separate equipment records
- How documents, applications, accessories, and branch availability are presented on detail pages

## Decision Status

No Rain for Rent field structure is approved as the final ALLRENTZ model yet. The current adapter exists only to prove that the captured vendor layout can be converted into consistent comparison records.
