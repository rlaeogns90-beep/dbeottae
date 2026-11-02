import { test } from "node:test";
import assert from "node:assert/strict";
import { runAction } from "../actions";
import { seed } from "../seed";
import { forClient } from "./secrets";

test("영업자에게는 광고주 상담 메모와 메모 기록을 보내지 않는다", () => {
  const base = seed(Date.parse("2026-11-02T03:00:00Z"));
  const asg = base.assignments.find((a) => a.advertiserId === "adv1")!;
  const r = runAction(base, { role: "advertiser", id: "adv1" }, { type: "addMemo", id: asg.id, text: "비밀 통화 내용" });
  if ("error" in r) throw new Error(r.error);
  const view = forClient(r.state, { role: "partner", id: "pt1" });
  const seen = view.assignments.find((a) => a.id === asg.id);
  assert.ok(seen, "영업자 화면에 배정 실적은 보여야 한다");
  assert.equal(seen.memo, "");
  assert.equal(seen.memos, undefined);
});
