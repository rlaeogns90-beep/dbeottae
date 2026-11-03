import { test } from "node:test";
import assert from "node:assert/strict";
import { runAction } from "./actions";
import { DEFAULT_TEST_PHONES, isTestPhone, routeLead } from "./engine";
import { seed } from "./seed";
import { forClient } from "./server/secrets";
import type { Lead, State } from "./types";

// 평일 오전(한국 12시)이라 주말 중지에 걸리지 않는다.
const now = new Date("2026-11-02T03:00:00Z");
const base = seed(now.getTime());
const lead = (phone: string): Lead => ({ id: "ld_t", name: "테스트", phone, car: "", site: "시험", createdAt: now.toISOString(), status: "waiting" });
const routed = (s: State, phone: string) => routeLead(s, lead(phone), now).leads.find((l) => l.id === "ld_t")!;
const admin = { role: "admin" as const, id: "ad1" };

test("처음에는 대표님이 준 두 번호가 테스트 번호다", () => {
  assert.deepEqual(DEFAULT_TEST_PHONES, ["010-5288-6405", "010-8975-6207"]);
  assert.equal(isTestPhone(base, "010-5288-6405"), true);
  assert.equal(isTestPhone(base, "01089756207"), true, "하이픈 없이 들어와도 같은 번호");
  assert.equal(isTestPhone(base, "010-1111-2222"), false);
});

test("테스트 번호는 받을 광고주가 있어도 배정하지 않고 관리자 대기로 보낸다", () => {
  assert.equal(routed(base, "010-1111-2222").status, "assigned", "일반 번호는 자동 배정된다 (시험 전제)");
  const t = routed(base, "010-5288-6405");
  assert.equal(t.status, "waiting");
  assert.equal(t.waitReason, "테스트 번호");
});

test("테스트 번호로는 예치금이 차감되지 않는다", () => {
  const next = routeLead(base, lead("010-5288-6405"), now);
  assert.equal(next.wallet.length, base.wallet.length);
  assert.equal(next.assignments.length, base.assignments.length);
});

test("관리자가 테스트 번호를 바꾸면 바꾼 번호만 테스트 번호다", () => {
  const r = runAction(base, admin, { type: "updateSettings", patch: { testPhones: ["01099998888", "", "12"] } });
  if ("error" in r) throw new Error(r.error);
  assert.deepEqual(r.state.settings.testPhones, ["010-9999-8888"], "빈 칸과 짧은 번호는 빼고 하이픈을 맞춰 저장");
  assert.equal(isTestPhone(r.state, "010-9999-8888"), true);
  assert.equal(isTestPhone(r.state, "010-5288-6405"), false);
});

test("테스트 번호를 모두 지우면 테스트 번호가 없다", () => {
  const r = runAction(base, admin, { type: "updateSettings", patch: { testPhones: [] } });
  if ("error" in r) throw new Error(r.error);
  assert.equal(isTestPhone(r.state, "010-5288-6405"), false);
});

test("테스트 번호는 10개까지, 잘못된 형식은 거절", () => {
  const many = Array.from({ length: 11 }, (_, i) => `010-0000-${String(i).padStart(4, "0")}`);
  assert.ok("error" in runAction(base, admin, { type: "updateSettings", patch: { testPhones: many } }));
  assert.ok("error" in runAction(base, admin, { type: "updateSettings", patch: { testPhones: "010-1111-2222" as unknown as string[] } }));
});

test("테스트 번호는 관리자에게만 보낸다", () => {
  assert.equal(forClient(base, { role: "advertiser", id: "adv1" }).settings.testPhones, undefined);
  assert.equal(forClient(base, null).settings.testPhones, undefined);
});
