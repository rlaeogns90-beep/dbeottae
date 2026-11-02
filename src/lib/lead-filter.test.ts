import { test } from "node:test";
import assert from "node:assert/strict";
import { kstDate, matchLead, quickRange } from "./lead-filter";

const now = new Date("2026-11-02T03:00:00Z"); // 한국 시각 2026-11-02 12:00
const lead = { name: "김민준", phone: "010-2345-1101", car: "Sorento", createdAt: "2026-11-01T15:30:00Z" }; // 한국 11-02 00:30
const all = { q: "", from: "", to: "" };

test("한국 날짜", () => assert.equal(kstDate("2026-11-01T15:30:00Z"), "2026-11-02"));

test("빠른 기간", () => {
  assert.deepEqual(quickRange("today", now), { from: "2026-11-02", to: "2026-11-02" });
  assert.deepEqual(quickRange("yesterday", now), { from: "2026-11-01", to: "2026-11-01" });
  assert.deepEqual(quickRange("week", now), { from: "2026-10-27", to: "2026-11-02" });
  assert.deepEqual(quickRange("month", now), { from: "2026-11-01", to: "2026-11-02" });
});

test("검색", () => {
  assert.ok(matchLead(lead, all));
  assert.ok(matchLead(lead, { ...all, q: "민준" }));
  assert.ok(matchLead(lead, { ...all, q: "01023451101" }));
  assert.ok(matchLead(lead, { ...all, q: "010-2345-1101" }));
  assert.ok(matchLead(lead, { ...all, q: "2345" }));
  assert.ok(matchLead(lead, { ...all, q: "sorento" }));
  assert.ok(!matchLead(lead, { ...all, q: "이서연" }));
});

test("날짜 범위는 한국 날짜, 양 끝 포함", () => {
  assert.ok(matchLead(lead, { ...all, from: "2026-11-02", to: "2026-11-02" }));
  assert.ok(!matchLead(lead, { ...all, from: "2026-11-01", to: "2026-11-01" }));
  assert.ok(matchLead(lead, { ...all, from: "2026-11-02" }));
  assert.ok(!matchLead(lead, { ...all, to: "2026-11-01" }));
});
