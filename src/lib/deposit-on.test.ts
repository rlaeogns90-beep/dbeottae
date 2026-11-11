import { test } from "node:test";
import assert from "node:assert/strict";
import { runAction } from "./actions";
import { seed } from "./seed";
import type { State } from "./types";

const base = seed(Date.parse("2026-11-02T03:00:00Z"));
const admin = { role: "admin" as const, id: "ad1" };

// adv1의 잔액을 0으로, 수신을 offBy로 끈 뒤 44,000원 입금 요청 1건을 둔다.
const offWithDeposit = (offBy: "auto" | "self" | "admin", amount = 44000): State => ({
  ...base,
  wallet: base.wallet.filter((t) => t.advertiserId !== "adv1"),
  advertisers: base.advertisers.map((a) => (a.id === "adv1" ? { ...a, status: "approved", industry: undefined, receiving: false, offBy, offAt: "2026-11-02T02:00:00Z" } : a)),
  deposits: [{ id: "dpT", advertiserId: "adv1", amount, depositor: "김민준", at: "2026-11-02T02:30:00Z", status: "pending" }],
});
const after = (s: State, ok = true) => {
  const r = runAction(s, admin, { type: "handleDeposit", id: "dpT", ok });
  assert.ok("state" in r, JSON.stringify(r));
  return r.state.advertisers.find((a) => a.id === "adv1")!;
};

test("입금 승인하면 꺼져 있던 수신이 바로 켜진다 (자동 OFF·본인 OFF)", () => {
  for (const offBy of ["auto", "self"] as const) {
    const a = after(offWithDeposit(offBy));
    assert.equal(a.receiving, true);
    assert.equal(a.offBy, undefined);
  }
});

test("관리자가 끈 광고주, 반려, 1건 단가보다 적은 입금은 켜지 않는다", () => {
  assert.equal(after(offWithDeposit("admin")).receiving, false);
  assert.equal(after(offWithDeposit("auto"), false).receiving, false);
  assert.equal(after(offWithDeposit("auto", 10000)).receiving, false);
});
