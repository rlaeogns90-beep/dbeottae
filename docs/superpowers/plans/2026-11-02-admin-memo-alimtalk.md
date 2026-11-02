# DB 현황 검색·알림톡 정리·상담 메모 기록 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 DB 현황에 날짜·검색 필터, 알림톡 이름 정리와 잔여·소진 알림톡 2종, 광고주 상담 메모 기록과 목록 미리 보기를 더한다.

**Architecture:** 판단 로직은 순수 함수(`src/lib/lead-filter.ts`, `src/lib/memo.ts`, `engine.ts`의 `balanceNotice`, `actions.ts`의 `addMemo`)로 두고 `npm test`로 고정한다. 화면은 그 함수를 쓴다. 저장은 기존 상태(JSON) 구조에 필드만 더한다.

**Tech Stack:** Next.js 15, React 19, Tailwind 4, Neon(app_state JSON), 솔라피 알림톡. 테스트는 기존 `npm test`(esbuild + node:test).

**Spec:** `docs/superpowers/specs/2026-11-02-admin-memo-alimtalk-design.md`

## Global Constraints

- 화면 문구·주석 한국어, 새 패키지 설치 없음.
- 한국 날짜 기준(UTC+9)으로 날짜를 비교한다.
- 저장 필드 `templateTask`, `memo` 이름은 바꾸지 않는다(기존 값 유지).
- 새 템플릿 ID가 비어 있으면 발송하지 않는다.
- 메모: 1~2,000자, 배정 건당 기록 최대 200개(최신이 앞).

## Review Focus

1. 연락처 검색에 하이픈 있는/없는 입력 모두 — 숫자만 비교해 찾아야 한다. (Task 1 테스트)
2. 자정 근처 접수(예: 한국 시각 00:30 = UTC 전날 15:30) — 한국 날짜로 걸러야 한다. (Task 1 테스트)
3. 잔액이 2건→1건이면 잔여 안내, 1건→0건(자동 OFF)이면 소진 안내만(잔여 안내와 동시 발송 없음). (Task 3 테스트)
4. 다른 광고주의 배정 건에 메모 추가 시도 — 거절. (Task 4 테스트)
5. 이전 단일 메모만 있는 배정 건 — 목록·상세에 "이전 메모"로 보인다. (Task 4 테스트)

---

### Task 1: DB 현황 날짜 필터와 검색

**Files:** Create `src/lib/lead-filter.ts`, `src/lib/lead-filter.test.ts` · Modify `src/app/admin/page.tsx`

**Produces:**
```ts
export const kstDate = (iso: string) => string;                 // "YYYY-MM-DD" (한국 날짜)
export type QuickRange = "today" | "yesterday" | "week" | "month";
export function quickRange(kind: QuickRange, now?: Date): { from: string; to: string };
export function matchLead(l: Pick<Lead, "name" | "phone" | "car" | "createdAt">, f: { q: string; from: string; to: string }): boolean;
```

- [ ] 테스트 작성: 자정 근처 `kstDate("2026-11-01T15:30:00Z") === "2026-11-02"`; `quickRange("week", 2026-11-02 KST)` → `{from:"2026-10-27", to:"2026-11-02"}`; `quickRange("month")` → `from "2026-11-01"`; `yesterday` → 둘 다 "2026-11-01"; `matchLead`: 이름 일부, "01023451101"과 "010-2345-1101" 둘 다로 같은 번호 찾기, 차종 대소문자 무시, 범위 밖 날짜 제외, 빈 필터는 모두 통과.
- [ ] `npm test` FAIL 확인 → 구현 → PASS.
- [ ] 화면: 기존 필터 줄 옆/아래에 검색 Input(placeholder "이름·연락처·차종 검색"), 날짜 Input 2개(type="date"), 빠른 버튼 4개. `filtered`에 `matchLead` 조건 추가, `filtering`과 "필터 초기화"에 포함. 휴대폰 폭에서 줄바꿈되게(flex-wrap).
- [ ] `npx tsc --noEmit`, `npm run lint` 통과 후 커밋 "DB 현황에 접수 날짜 필터와 이름·연락처·차종 검색".

### Task 2: 알림톡 이름 정리

**Files:** Modify `src/lib/server/solapi.ts`(TASK_LABEL.support.name "챗봇 문의"), `src/components/solapi-card.tsx`(TASK_NAME.support "챗봇 문의", "처리 알림" → "관리자 확인 안내": 상태 목록, 칸 이름, 받을 번호 제목, 시험 버튼, 카드 설명), `src/app/api/admin/solapi-test/route.ts`(TEST_LABEL.task), `src/lib/types.ts` 주석.

- [ ] `grep -rn "처리 알림\|고객센터" src/components/solapi-card.tsx src/lib/server/solapi.ts src/app/api/admin/solapi-test` 결과가 0줄이 될 때까지 바꾼다(주석 포함).
- [ ] 타입·린트 통과 후 커밋 "알림톡 설정: 고객센터→챗봇 문의, 처리 알림→관리자 확인 안내".

### Task 3: 잔여 수량·소진 알림톡

**Files:** Modify `src/lib/engine.ts`, `src/lib/types.ts`(solapi에 `templateRemain?`, `templateEmpty?`), `src/lib/actions.ts`(updateSettings에 두 칸), `src/lib/server/solapi.ts`, `src/app/api/action/route.ts`, `src/app/api/webhook/route.ts`, `src/components/solapi-card.tsx`, `src/app/api/admin/solapi-test/route.ts` · Create `src/lib/engine.test.ts`, `docs/alimtalk-templates.md`

**Produces:**
```ts
// engine.ts
export function balanceNotice(s: State, advertiserId: string): { kind: "remain" | "empty"; balance: number; left: number } | null;
// solapi.ts
export const balanceVars = (name: string, balance: number, left: number): Record<string, string>; // 광고주명, 잔액 "44,000원", 남은건수 "1건", url host/app/wallet
export async function notifyBalance(s: State, leadId: string): Promise<void>;
```
- `balanceNotice`: 광고주 `receiving === false && offBy === "auto"` 이고 left === 0 → empty, 아니고 left === 1 → remain, 그 밖 null. left = ⌊balanceOf ÷ priceOf(s, adv.industry)⌋.

- [ ] 테스트(`engine.test.ts`, `seed()` 사용): 잔액 3건분 광고주에 `assign` 1건 → null; 2건분 → remain(left 1); 1건분 → empty(left 0, 자동 OFF); 없는 광고주 → null.
- [ ] FAIL → 구현 → PASS.
- [ ] `notifyBalance`: 배정 건의 광고주로 `balanceNotice`, kind별 템플릿 ID가 있고 `enabled`일 때만 발송, `report` 문구 "{이름} 광고주에게 잔여 수량 안내/소진 안내 알림톡". `notifyAssigned` 직후 두 곳(action route의 관리자 배정, webhook)에서 호출.
- [ ] 설정 화면: "잔여 수량 안내 템플릿 ID (광고주용)" hint "구매 가능한 DB가 1건 남으면", "소진 안내 템플릿 ID (광고주용)" hint "예치금을 다 써서 수신이 꺼지면", 상태 목록 2줄, 시험 발송 버튼 2개(`which: "remain" | "empty"`, 예시 `balanceVars("테스트", 44000, 1)` / `balanceVars("테스트", 0, 0)`).
- [ ] `docs/alimtalk-templates.md`: 두 템플릿 문구 초안(변수 #{광고주명} #{잔액} #{남은건수} #{url}, 버튼 "예치금 충전하기" → #{url}), 기존 템플릿 이름 변경 메모.
- [ ] 타입·린트·테스트 통과 후 커밋 "잔여 수량·소진 안내 알림톡 추가".

### Task 4: 상담 메모 기록과 목록 미리 보기

**Files:** Modify `src/lib/types.ts`(Assignment에 `memos?: { at: string; text: string }[]`), `src/lib/actions.ts`, `src/lib/store.tsx`(`addMemo(id, text)`), `src/app/app/leads/[id]/page.tsx`, `src/components/lead-parts.tsx` · Create `src/lib/memo.ts`, `src/lib/memo.test.ts`

**Produces:**
```ts
// actions.ts
| { type: "addMemo"; id: string; text: string }          // ADVERTISER_ACTIONS, 본인 건만
// memo.ts
export const memoLog = (a: Pick<Assignment, "memo" | "memos">) => { at?: string; text: string }[]; // 최신순, memos 없고 memo 있으면 [{text: memo}]
export const latestMemo = (a) => string | undefined;
```

- [ ] 테스트(`memo.test.ts`, `seed()`·`runAction`): 본인 건에 addMemo 2번 → memos 길이 2, 최신이 앞, memo = 최신 글; 다른 광고주 건 → error; 빈 글·2,001자 → error; 201번째 추가 시 200개 유지; `memoLog`가 이전 단일 메모를 시각 없이 1줄로; `latestMemo` 최신 글.
- [ ] FAIL → 구현 → PASS.
- [ ] 상세: 입력칸 + "메모 저장"(빈 글이면 비활성) → `addMemo`, 입력칸 비움; 아래 목록 "메모 기록 n" 최신순, 각 줄 시각(`dateTime`, 없으면 "이전 메모") + 글(줄바꿈 유지).
- [ ] `LeadRow`: 차종 줄 아래 `latestMemo`가 있으면 `truncate` 한 줄(아이콘 없이 "메모 · 글").
- [ ] 타입·린트·테스트 통과 후 커밋 "상담 메모 기록 쌓기와 목록에 최근 메모 표시".

### Task 5: 확인과 배포

- [ ] `npm run build` 성공.
- [ ] 배포용 빌드를 로컬 시험용 DB로 실행해 브라우저 확인(390·1280): DB 현황 필터·검색·초기화, 알림톡 설정 화면 이름과 새 칸 저장, 광고주 메모 저장→기록→새로고침 유지→목록·홈 표시, 가로 넘침 없음. 시험 메모는 남겨도 되는 시험용 DB.
- [ ] 대표님 확인 후 main 반영·푸시, 실제 사이트 반영 확인.
