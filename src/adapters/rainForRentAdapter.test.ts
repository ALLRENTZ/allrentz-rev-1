import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { adaptRainForRentTankBoxExport } from "./rainForRentAdapter.ts";

const fixtureUrl = new URL("../test/fixtures/rainforrent-tank-box-raw.json", import.meta.url);
const rawFixtureText = await readFile(fixtureUrl, "utf8");
const rawFixture = JSON.parse(rawFixtureText);
const records = adaptRainForRentTankBoxExport(rawFixture);
const base = "https://www.rainforrent.com";
const expected = [
  ["Flat Top Smooth Wall Tank", "21000", "Flat Top", "flat-top-smooth-wall-tank", "2018/08/TANKFLATTOPSMOOTHWAL.jpg"],
  ["Flat Top Corrugated Wall Tank", "21000", "Flat Top", "flat-top-corrugated-wall-tank", "2018/08/TANKFLATTOP-1.jpg"],
  ["Flat Top Coated Steel Tank", "21000", "Flat Top", "flat-top-coated-steel-tank", "2018/08/TANKFLATTOPWT.jpg"],
  ["Bi-Level Tank", "21000", "Bi Level", "bi-level-tank", "2018/08/TANKBILEVEL.jpg"],
  ["Bi-Level Coated Steel Tank", "21000", "Bi Level", "bi-level-coated-steel-tank", "2018/08/TANKBILEVEL.jpg"],
  ["Steel Potable Water Storage Tank", "21000", "Flat Top", "steel-potable-water-storage-tank", "2018/08/TANKFLATTOPSMOOTHWAL.jpg"],
  ["Open-Top Mini Weir Steel Tank", "8594", "Open-Top Mini Weir", "open-top-mini-weir-steel-tank", "2025/10/photo-mini-weir-tank-side-no-BG.png"],
  ["6300 Gal Poly Roll-Off Tank", "6300", "Poly Roll-Off", "poly-roll-off-6300-gallon-tank", "2020/08/Poly-Cube_angle_Vapor-Tight.jpg"],
  ["Stainless Steel Frac Tank", "21000", "Flat Top", "stainless-steel-frac-tank", "2018/08/TANKSTAINLESS.jpg"],
  ["Flip Top Tank", "18100", "Flip Top", "flip-top-tank", "2018/08/TANKFLIPTOP.jpg"],
  ["Flip Top Coated Steel Tank", "18100", "Flip Top", "flip-top-coated-steel-tank", "2018/08/TANKFLIPTOP.jpg"],
  ["5HP Mixer Tank", "18100", "Mixer", "5hp-mixer-tank", "2018/08/TANKMIXER.jpg"],
].map(([equipment_name, capacity, equipment_type, slug, image]) => ({
  supplier_name: "Rain for Rent",
  equipment_name,
  capacity,
  equipment_type,
  product_detail_url: `${base}/equipment/${slug}/`,
  image_url: `${base}/wp-content/uploads/${image}`,
}));

test("normalizes all 12 Rain for Rent tank and box cards", () => {
  assert.deepEqual(records, expected);
});

test("extracts the Flat Top Smooth Wall Tank exactly", () => {
  assert.deepEqual(records[0], expected[0]);
});

test("returns complete records with absolute Rain for Rent URLs", () => {
  for (const record of records) {
    assert.equal(record.supplier_name, "Rain for Rent");
    assert.ok(record.equipment_name && record.equipment_type);
    assert.match(record.capacity, /^\d+(?:\.\d+)?$/);
    assert.match(record.product_detail_url, /^https:\/\/www\.rainforrent\.com\/equipment\//);
    assert.match(record.image_url, /^https:\/\/www\.rainforrent\.com\/wp-content\/uploads\//);
  }
});

test("normalizes formatted capacity values", () => {
  assert.equal(records.find((r) => r.equipment_name === "Open-Top Mini Weir Steel Tank")?.capacity, "8594");
});

test("uses lazy data-src instead of the placeholder src", () => {
  assert.ok(records.every((record) => !record.image_url.startsWith("data:")));
});

test("deduplicates product cards by detail URL", () => {
  assert.equal(new Set(records.map((record) => record.product_detail_url)).size, records.length);
});

test("accepts serialized export JSON", () => {
  assert.deepEqual(adaptRainForRentTankBoxExport(rawFixtureText), records);
});

test("accepts plain HTML", () => {
  assert.deepEqual(adaptRainForRentTankBoxExport(rawFixture.results[0].content), records);
});

test("rejects input without product HTML", () => {
  assert.throws(() => adaptRainForRentTankBoxExport({ results: [] }), /does not contain HTML content/);
});
