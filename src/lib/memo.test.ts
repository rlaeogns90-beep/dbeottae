import { test } from "node:test";
import assert from "node:assert/strict";
import { runAction } from "./actions";
import { latestMemo, memoLog } from "./memo";
import { seed } from "./seed";
import type { State } from "./types";

const base = seed(Date.parse("2026-11-02T03:00:00Z"));
const mine = base.assignments.find((a) => a.advertiserId === "adv1")!;
const other = base.assignments.find((a) => a.advertiserId !== "adv1")!;
const me = { role: "advertiser" as const, id: "adv1" };
const add = (s: State, id: string, text: string, at = "2026-11-02T03:00:00Z") => runAction(s, me, { type: "addMemo", id, text }, new Date(at));
const stateOf = (r: ReturnType<typeof add>) => {
  if ("error" in r) throw new Error(r.error);
  return r.state;
};

test("메모를 저장하면 최신이 앞에 쌓이고 memo는 최신 글", () => {
  const s1 = stateOf(add(base, mine.id, "첫 통화", "2026-11-02T03:00:00Z"));
  const s2 = stateOf(add(s1, mine.id, "견적 보냄", "2026-11-02T04:00:00Z"));
  const a = s2.assignments.find((x) => x.id === mine.id)!;
  assert.deepEqual(a.memos, [{ at: "2026-11-02T04:00:00.000Z", text: "견적 보냄" }, { at: "2026-11-02T03:00:00.000Z", text: "첫 통화" }]);
  assert.equal(a.memo, "견적 보냄");
});

test("다른 광고주 배정 건에는 못 씀", () => assert.ok("error" in add(base, other.id, "남의 메모")));

test("빈 글과 2,001자는 거절", () => {
  assert.ok("error" in add(base, mine.id, "   "));
  assert.ok("error" in add(base, mine.id, "가".repeat(2001)));
});

test("기록은 최대 200개", () => {
  let s = base;
  for (let i = 0; i < 201; i++) s = stateOf(add(s, mine.id, `메모 ${i}`));
  const a = s.assignments.find((x) => x.id === mine.id)!;
  assert.equal(a.memos?.length, 200);
  assert.equal(a.memos?.[0].text, "메모 200");
});

test("이전 단일 메모는 시각 없는 한 줄", () => {
  assert.deepEqual(memoLog({ memo: "옛 메모", memos: undefined }), [{ text: "옛 메모" }]);
  assert.deepEqual(memoLog({ memo: "", memos: undefined }), []);
  assert.equal(latestMemo({ memo: "옛 메모", memos: undefined }), "옛 메모");
  assert.equal(latestMemo({ memo: "b", memos: [{ at: "x", text: "b" }, { at: "y", text: "a" }] }), "b");
  assert.equal(latestMemo({ memo: "", memos: [] }), undefined);
});
