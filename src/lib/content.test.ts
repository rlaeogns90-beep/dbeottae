import { test } from "node:test";
import assert from "node:assert/strict";
import { faqs, minChargeText } from "./content";

const ans = (q: string) => faqs.find(([k]) => k === q)?.[1] ?? "";

test("최소 충전은 업종별 10건분", () => {
  assert.equal(minChargeText(), "신차 장기렌트 440,000원, 오토바이 매매 165,000원");
  assert.match(ans("가격은 얼마인가요?"), /신차 장기렌트 440,000원, 오토바이 매매 165,000원/);
});

test("하루 최대 3건 FAQ", () => {
  assert.match(ans("하루에 몇 건까지 받나요?"), /하루 최대 3건/);
  assert.equal(faqs[5][0], "하루에 몇 건까지 받나요?");
});

test("결번은 기한 없음, 3시간 문구 없음", () => {
  assert.match(ans("어떤 DB가 불량으로 인정되나요?"), /받은 시점과 상관없이/);
  assert.ok(faqs.every(([, a]) => !a.includes("3시간")));
});
