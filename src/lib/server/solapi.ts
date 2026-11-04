// 솔라피 카카오 알림톡 발송. 솔라피 계정이 둘이다.
// - 기존 계정: 문의 접수·통계 알림. Key·Secret은 SOLAPI_API_KEY·SOLAPI_API_SECRET, PFID·발신번호는 관리자 설정.
// - 새 계정: 충전 완료·잔여 수량·소진·관리자 확인 안내. Key·Secret·PFID는 SOLAPI2_API_KEY·SOLAPI2_API_SECRET·SOLAPI2_PFID,
//   발신번호는 SOLAPI2_SENDER(없으면 관리자 설정의 발신번호). 템플릿은 검수가 끝난 것이라 ID를 코드에 고정한다.
// - Key·Secret이 없으면(로컬·미리보기) 아무것도 보내지 않는다. 설정의 '알림톡 발송 켜기'가 꺼져 있어도 보내지 않는다.
// - 보내다 실패하면 관리자 알림에 남기고, 접수·배정 처리는 그대로 진행한다.
import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { laneOf } from "../content";
import { balanceOf, priceOf, type noticeAfterAssign } from "../engine";
import { SITE_URL } from "../site";
import type { Advertiser, Assignment, Lead, Settings, State, TaskKind } from "../types";
import { alert } from "./ops";

type Solapi = Settings["solapi"];
const INDUSTRY = "신차 장기렌트";
const API = "https://api.solapi.com";

/** 새 계정에서 검수를 마친 템플릿 (문구를 바꾸면 다시 검수받아야 하므로 변수 이름도 그대로 맞춘다) */
export const TEMPLATES2 = {
  charged: "KA01TP261104004403229eN01uXZSSUo",
  remain: "KA01TP261104004735006cxJvcKAR096",
  empty: "KA01TP261104004835492BjowODNdmVj",
  task: "KA01TP261104005018718znlxlJF8kpY",
} as const;
const PFID2 = "KA01PF261103090330113L7gLOvKTpxL";

export interface Account { key?: string; secret?: string; pfId: string; sender: string }

/** 기존 계정: 문의 접수·통계 알림 */
export const account1 = (cfg: Solapi): Account => ({ key: process.env.SOLAPI_API_KEY, secret: process.env.SOLAPI_API_SECRET, pfId: cfg.pfId, sender: cfg.sender });
/** 새 계정: 충전 완료·잔여 수량·소진·관리자 확인 안내 */
export const account2 = (cfg: Solapi): Account => ({
  key: process.env.SOLAPI2_API_KEY, secret: process.env.SOLAPI2_API_SECRET,
  pfId: process.env.SOLAPI2_PFID || PFID2, sender: process.env.SOLAPI2_SENDER || cfg.sender,
});
export const account2Ready = () => !!(process.env.SOLAPI2_API_KEY && process.env.SOLAPI2_API_SECRET);

export type SendResult = { ok: true } | { ok: false; skipped?: boolean; error: string };

const digits = (v: string) => v.replace(/\D/g, "");
const host = SITE_URL.replace(/^https?:\/\//, "");

function authHeader({ key, secret }: Account) {
  if (!key || !secret) return null;
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", secret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 카카오 알림톡 1건. 템플릿에 정해진 변수 이름(#{...})을 그대로 키로 넘긴다. */
export async function sendKakao(acc: Account, to: string, templateId: string, variables: Record<string, string>): Promise<SendResult> {
  const auth = authHeader(acc);
  if (!auth) return { ok: false, skipped: true, error: "이 환경에는 솔라피 키가 없어 보내지 않았습니다." };
  if (!acc.pfId || !templateId || !acc.sender) return { ok: false, skipped: true, error: "PFID·템플릿 ID·발신번호를 먼저 등록해 주세요." };
  const phone = digits(to);
  if (phone.length < 10) return { ok: false, error: `받는 번호가 올바르지 않습니다 (${to || "없음"}).` };

  const vars = Object.fromEntries(Object.entries(variables).map(([k, v]) => [`#{${k}}`, v]));
  try {
    const res = await fetch(`${API}/messages/v4/send`, {
      method: "POST",
      headers: { Authorization: auth, "content-type": "application/json" },
      body: JSON.stringify({ message: { to: phone, from: digits(acc.sender), kakaoOptions: { pfId: acc.pfId, templateId, variables: vars } } }),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json().catch(() => ({}))) as { errorCode?: string; errorMessage?: string };
    if (res.ok) return { ok: true };
    return { ok: false, error: `${body.errorMessage ?? `HTTP ${res.status}`}${body.errorCode ? ` (${body.errorCode})` : ""}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── 템플릿별 변수 만들기 ──
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** 신청 내용 줄: 차종·메모가 있는 것만 */
function detail(lead: Lead) {
  const lines = [lead.car && `- 차종 : ${lead.car}`, lead.months ? `- 개월수 : ${lead.months}개월` : "", lead.memo && `- 메모 : ${clip(lead.memo.replace(/\s+/g, " "), 100)}`].filter(Boolean);
  return lines.length ? lines.join("\n") : "- 신청 내용 : 없음";
}
const siteOf = (lead: Lead) => lead.pageName || lead.site || "DB어때";

const kstDay = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);

export const inquiryVars = (lead: Lead, asg: Assignment): Record<string, string> => ({
  사이트명: siteOf(lead),
  상담분류1: `${INDUSTRY} 단독 DB`,
  고객명: lead.name,
  상담분류2: "상담 신청이",
  고객연락처: lead.phone,
  신청내용: detail(lead),
  url: `${host}/app/leads/${asg.id}`,
});

export function statsVars(s: State, lead: Lead): Record<string, string> {
  const day = kstDay(lead.createdAt);
  const today = s.leads.filter((l) => kstDay(l.createdAt) === day);
  const [, m, d] = day.split("-");
  return {
    사이트명: siteOf(lead),
    날짜: `${Number(m)}월 ${Number(d)}일`,
    구분: INDUSTRY,
    "총 개수": String(today.length),
    "중복제외 개수": String(new Set(today.map((l) => l.phone)).size),
    고객연락처: lead.phone,
    "기타 신청내용": detail(lead),
    url: `${host}/admin`,
  };
}

async function report(what: string, r: SendResult) {
  if (!r.ok && !r.skipped) await alert("error", "알림톡", `${what} 발송에 실패했습니다: ${r.error}`);
}

/** 새 DB가 광고주에게 배정됐을 때: 문의 접수 알림톡(광고주) */
export async function notifyAssigned(s: State, leadId: string) {
  const cfg = s.settings.solapi;
  if (!cfg.enabled) return;
  const asg = s.assignments.find((a) => a.leadId === leadId);
  const lead = s.leads.find((l) => l.id === leadId);
  const adv = asg && s.advertisers.find((a) => a.id === asg.advertiserId);
  if (!asg || !lead || !adv) return;
  await report(`${adv.name} 광고주에게 문의 접수 알림톡`, await sendKakao(account1(cfg), adv.phone, cfg.templateInquiry, inquiryVars(lead, asg)));
}

// ── 새 계정 템플릿 4종 ──

/** 관리자 확인 안내의 #{처리항목} */
export const TASK_LABEL: Record<TaskKind, string> = { member: "가입승인", deposit: "입금확인", defect: "불량처리", support: "챗봇문의" };

export const taskVars = (kind: TaskKind, advertiserName: string): Record<string, string> => ({ 광고주명: advertiserName, 처리항목: TASK_LABEL[kind] });

/** 처리할 일이 새로 생겼을 때: 관리자 확인 안내 알림톡(그 종류에 등록한 관리자 번호들) */
export async function notifyTask(s: State, kind: TaskKind, advertiserName: string) {
  const cfg = s.settings.solapi;
  const phones = cfg.taskPhones?.[kind] ?? [];
  if (!cfg.enabled || !phones.length) return;
  const vars = taskVars(kind, advertiserName);
  for (const to of phones) await report(`관리자 확인 안내(${TASK_LABEL[kind]}) 알림톡`, await sendKakao(account2(cfg), to, TEMPLATES2.task, vars));
}

/** 2026-11-04 15:30 (한국 시간) */
const kstDateTime = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");

/** 충전 완료 안내 변수. 건수는 업종 단가(VAT 포함)로 나눈 값, 금액은 숫자만(템플릿 뒤에 '원'이 붙어 있다). */
export const chargedVars = (name: string, product: string, amount: number, balance: number, price: number, at: string): Record<string, string> => ({
  광고주명: name,
  상품명: product,
  충전건수: String(Math.floor(amount / price)),
  잔여건수: String(Math.max(0, Math.floor(balance / price))),
  충전금액: amount.toLocaleString(),
  충전일시: kstDateTime(at),
});

const productOf = (adv: Advertiser) => laneOf(adv.industry);

/** 관리자가 입금을 확인했을 때: 충전 완료 알림톡(광고주) */
export async function notifyCharged(s: State, depositId: string) {
  const cfg = s.settings.solapi;
  if (!cfg.enabled) return;
  const d = s.deposits.find((x) => x.id === depositId);
  const adv = d && s.advertisers.find((a) => a.id === d.advertiserId);
  if (!d || d.status !== "approved" || !adv) return;
  const vars = chargedVars(adv.name, productOf(adv), d.amount, balanceOf(s, adv.id), priceOf(s, adv.industry), d.handledAt ?? new Date().toISOString());
  await report(`${adv.name} 광고주에게 충전 완료 알림톡`, await sendKakao(account2(cfg), adv.phone, TEMPLATES2.charged, vars));
}

/** 잔여 수량 안내('1건'은 템플릿 고정 문구)와 소진 안내 변수 */
export const remainVars = (name: string, product: string): Record<string, string> => ({ 광고주명: name, 상품명: product });
export const emptyVars = (name: string): Record<string, string> => ({ 광고주명: name });

/**
 * DB가 배정된 직후: 구매 가능한 DB가 1건 남으면 잔여 수량 안내, 예치금이 소진돼 수신이 꺼지면 소진 안내(광고주).
 * 안내 종류(n)는 배정을 저장하는 순간에 계산해 넘겨받는다(noticeAfterAssign). 나중에 다시 읽으면 동시 접수 때 중복·누락된다.
 */
export async function notifyBalance(s: State, n: ReturnType<typeof noticeAfterAssign>) {
  const cfg = s.settings.solapi;
  if (!cfg.enabled || !n) return;
  const adv = s.advertisers.find((a) => a.id === n.advertiserId);
  if (!adv) return;
  const [template, label, vars] =
    n.kind === "empty" ? [TEMPLATES2.empty, "소진 안내", emptyVars(adv.name)] : [TEMPLATES2.remain, "잔여 수량 안내", remainVars(adv.name, productOf(adv))];
  await report(`${adv.name} 광고주에게 ${label} 알림톡`, await sendKakao(account2(cfg), adv.phone, template, vars));
}

/** 새 DB가 접수됐을 때: 통계 알림톡(관리자) */
export async function notifyStats(s: State, leadId: string) {
  const cfg = s.settings.solapi;
  if (!cfg.enabled || !cfg.statsEnabled || !cfg.statsPhone) return;
  const lead = s.leads.find((l) => l.id === leadId);
  if (!lead) return;
  await report("관리자 통계 알림톡", await sendKakao(account1(cfg), cfg.statsPhone, cfg.templateStats, statsVars(s, lead)));
}
