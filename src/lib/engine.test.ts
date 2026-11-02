import { test } from "node:test";
import assert from "node:assert/strict";
import { assign, balanceNotice, noticeAfterAssign } from "./engine";
import { seed } from "./seed";
import type { State } from "./types";

const base = seed(Date.parse("2026-11-02T03:00:00Z"));
const leadId = base.leads[0].id;

// adv1의 예치금을 n건분(44,000원 × n)으로 맞추고 수신을 켠다.
const withBalance = (n: number): State => ({
  ...base,
  wallet: [{ id: "t1", advertiserId: "adv1", type: "charge", amount: n * 44000, at: "2026-11-01T00:00:00Z", note: "시험" }, ...base.wallet.filter((t) => t.advertiserId !== "adv1")],
  advertisers: base.advertisers.map((a) => (a.id === "adv1" ? { ...a, receiving: true, offBy: undefined, offAt: undefined, industry: undefined } : a)),
});
const after = (n: number) => assign(withBalance(n), leadId, "adv1", "admin");

test("3건분에서 1건 받으면 안내 없음", () => assert.equal(balanceNotice(after(3), "adv1"), null));

test("2건분에서 1건 받으면 잔여 수량 안내", () => {
  assert.deepEqual(balanceNotice(after(2), "adv1"), { kind: "remain", balance: 44000, left: 1 });
});

test("1건분에서 1건 받으면 소진 안내만", () => {
  const s = after(1);
  assert.equal(s.advertisers.find((a) => a.id === "adv1")?.offBy, "auto");
  assert.deepEqual(balanceNotice(s, "adv1"), { kind: "empty", balance: 0, left: 0 });
});

test("없는 광고주", () => assert.equal(balanceNotice(base, "nobody"), null));

test("배정 저장 시점의 상태로 안내를 정한다 (배정된 광고주 포함)", () => {
  assert.deepEqual(noticeAfterAssign(after(2), leadId), { advertiserId: "adv1", kind: "remain", balance: 44000, left: 1 });
  assert.equal(noticeAfterAssign(withBalance(2), leadId), null); // 아직 배정 전
});
