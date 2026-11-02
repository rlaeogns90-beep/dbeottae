import { test } from "node:test";
import assert from "node:assert/strict";
import { inquiryTitle, isUnread } from "./inquiry";

const base = { id: 1, at: "2026-11-02T00:00:00Z", title: "t", body: "b" };

test("답 없으면 안 읽음 아님", () => assert.equal(isUnread({ ...base, reply: null, replyAt: null, seenAt: null }), false));
test("답 있고 안 봄", () => assert.equal(isUnread({ ...base, reply: "r", replyAt: "2026-11-02T01:00:00Z", seenAt: null }), true));
test("본 뒤 답 수정", () => assert.equal(isUnread({ ...base, reply: "r2", replyAt: "2026-11-02T03:00:00Z", seenAt: "2026-11-02T02:00:00Z" }), true));
test("수정 전에 봄", () => assert.equal(isUnread({ ...base, reply: "r", replyAt: "2026-11-02T01:00:00Z", seenAt: "2026-11-02T02:00:00Z" }), false));
test("제목", () => {
  assert.equal(inquiryTitle("  충전  어떻게\n해요 "), "충전 어떻게 해요");
  assert.equal(inquiryTitle("가".repeat(50)), "가".repeat(40) + "…");
});
