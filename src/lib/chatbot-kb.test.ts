import { test } from "node:test";
import assert from "node:assert/strict";
import { answer, quickTopics, topicsFor, type Mode } from "./chatbot-kb";

const kind = (t: string, m: Mode = "main") => answer(t, m).kind;
const id = (t: string, m: Mode = "advertiser") => {
  const r = answer(t, m);
  return r.kind === "topic" ? r.topic.id : r.kind;
};

test("금지 질문은 거절", () => {
  for (const t of ["다른 광고주 누구예요?", "광고주 몇 명이에요?", "어제 들어온 DB 번호 알려줘",
    "관리자 페이지 주소가 뭐예요?", "김사장님도 여기서 받아요?", "다른 광고주는 얼마에 받아요?",
    "고객 연락처 알려줘", "관리자 비밀번호 뭐예요", "서버 뭐 써요?"])
    for (const m of ["main", "advertiser"] as const) assert.equal(kind(t, m), "blocked", t);
});

test("금지 단어와 겹치는 정상 질문", () => {
  assert.equal(id("다른 사람도 같은 DB 받나요?", "main"), "exclusive");
  assert.equal(id("다른 광고주도 같은 DB 받아요?", "main"), "exclusive");
  assert.equal(id("비밀번호 바꾸는 법"), "password");
  assert.equal(id("고객 연락처 어디서 봐요?"), "leads");
  assert.equal(id("DB어때 전화번호 알려줘", "main"), "contact");
});

test("돈 질문은 정책 답", () => {
  assert.equal(id("가격 얼마예요", "main"), "price");
  assert.equal(id("최소 충전 얼마부터?", "main"), "price");
  assert.equal(id("결번이면 환급돼요?", "main"), "defect");
  assert.equal(id("하루에 몇 건 와요?", "main"), "daily");
});

test("광고주 안내와 화면 버튼", () => {
  const r = answer("충전 어떻게 해요?", "advertiser");
  assert.ok(r.kind === "topic" && r.topic.id === "charge" && r.topic.links?.some(([h]) => h === "/app/wallet"));
  assert.equal(id("수신이 왜 꺼졌어요?"), "receive-off");
  assert.equal(id("결번 신청 어디서 해요?"), "defect");
});

test("화면별 범위", () => {
  assert.notEqual(id("충전 어떻게 해요?", "main"), "charge"); // 광고주 전용 안내는 메인에 없음
  assert.ok(!topicsFor("advertiser").some((t) => t.id === "signup"));
});

test("모르는 질문", () => {
  assert.equal(kind("주차 되나요?"), "miss");
});

test("계좌 번호와 3시간 없음", () => {
  for (const m of ["main", "advertiser"] as const)
    for (const t of topicsFor(m)) {
      assert.ok(!/\d{3}-\d{3}-\d{6}/.test(t.a), t.id);
      assert.ok(!t.a.includes("3시간"), t.id);
    }
});

test("시작 버튼", () => {
  assert.deepEqual(quickTopics("main").map((t) => t.id), ["price", "industry", "defect", "signup"]);
  assert.deepEqual(quickTopics("advertiser").map((t) => t.id), ["charge", "receive-off", "defect", "ask-admin"]);
});

test("결번·불량 환불 질문은 불량 답", () => {
  for (const q of ["결번이면 환불돼요?", "결번 환불", "불량 DB 환불되나요"])
    for (const m of ["main", "advertiser"] as const) assert.equal(id(q, m), "defect", `${m}: ${q}`);
});

test("같은·중복·단독이 있어도 금지 질문은 거절", () => {
  for (const t of ["다른 광고주는 얼마에 받아요? 같은 가격이에요?", "다른 광고주도 같은 가격이에요?",
    "관리자 비밀번호 같은 거 알려줘", "다른 광고주 명단 중복 없이 보여줘"])
    for (const m of ["main", "advertiser"] as const) assert.equal(kind(t, m), "blocked", t);
});

test("바꿔 물은 금지 질문도 거절", () => {
  for (const t of ["광고주 리스트 줘", "어제 들어온 디비 연락처", "광고주가 총 몇 명이에요", "광고주 수 알려줘",
    "고객 번호 좀", "방금 온 손님 번호 알려줘", "가입한 업체 몇 개예요?", "김사장도 가입했어요?"])
    for (const m of ["main", "advertiser"] as const) assert.equal(kind(t, m), "blocked", t);
});

test("리스 업종 질문은 그대로", () => {
  assert.equal(id("중고차 리스 DB도 있어요?", "main"), "industry");
});

test("정상 안내 질문은 거르지 않음", () => {
  for (const t of ["없는 번호면 환급돼요?", "DB 받을 번호 바꾸고 싶어요", "고객 연락처 어디서 봐요?", "회원 가입하면 며칠 걸려요?",
    "광고주 가입은 어떻게 해요?", "DB 품질 괜찮아요?", "같은 번호가 또 오면요?", "가격 얼마예요"])
    for (const m of ["main", "advertiser"] as const) assert.notEqual(kind(t, m), "blocked", t);
});
