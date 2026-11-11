import { test } from "node:test";
import assert from "node:assert/strict";
import { incentiveOf, partnerStats } from "./partner";
import { seed } from "./seed";
import type { State } from "./types";

test("영업자 인센티브: 신차 건별 수익 9,000원의 40%, 오토바이 0원, 결번 환급 제외", () => {
  assert.equal(incentiveOf("신차 장기렌트"), 3600);
  assert.equal(incentiveOf(undefined), 3600);
  assert.equal(incentiveOf("오토바이 매매"), 0);

  const base = seed(Date.parse("2026-11-02T03:00:00Z"));
  const at = "2026-11-02T03:00:00Z";
  const s: State = {
    ...base,
    advertisers: [
      { ...base.advertisers[0], id: "x1", referrer: "P1", industry: "신차 장기렌트" },
      { ...base.advertisers[0], id: "x2", referrer: "P1", industry: "오토바이 매매" },
    ],
    assignments: [
      { id: "a1", leadId: "l", advertiserId: "x1", assignedAt: at, method: "auto", amount: 44000, consult: "new", memo: "" },
      { id: "a2", leadId: "l", advertiserId: "x1", assignedAt: at, method: "auto", amount: 44000, consult: "new", memo: "" },
      { id: "a3", leadId: "l", advertiserId: "x1", assignedAt: at, method: "auto", amount: 44000, consult: "new", memo: "" },
      { id: "a4", leadId: "l", advertiserId: "x2", assignedAt: at, method: "auto", amount: 16500, consult: "new", memo: "" },
    ],
    defects: [{ ...base.defects[0], assignmentId: "a3", status: "approved" }],
  };
  const st = partnerStats(s, "P1", "2026-11");
  assert.equal(st.total.count, 3);
  assert.equal(st.total.margin, 18000);
  assert.equal(st.total.income, 7200);
});
