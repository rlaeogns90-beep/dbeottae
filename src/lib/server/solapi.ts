// 솔라피 카카오 알림톡 발송.
// - API Key·Secret은 서버 환경변수(SOLAPI_API_KEY·SOLAPI_API_SECRET)에만 있고, 없으면(로컬·미리보기) 아무것도 보내지 않는다.
// - 설정의 '알림톡 발송 켜기'가 꺼져 있으면 보내지 않는다.
// - 보내다 실패하면 관리자 알림에 남기고, 접수·배정 처리는 그대로 진행한다.
import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { SITE_URL } from "../site";
import type { Assignment, Lead, Settings, State, TaskKind } from "../types";
import { alert } from "./ops";

type Solapi = Settings["solapi"];
const INDUSTRY = "신차 장기렌트";
const API = "https://api.solapi.com";

export type SendResult = { ok: true } | { ok: false; skipped?: boolean; error: string };

const digits = (v: string) => v.replace(/\D/g, "");
const host = SITE_URL.replace(/^https?:\/\//, "");

function authHeader() {
  const key = process.env.SOLAPI_API_KEY;
  const secret = process.env.SOLAPI_API_SECRET;
  if (!key || !secret) return null;
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", secret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 카카오 알림톡 1건. 템플릿에 정해진 변수 이름(#{...})을 그대로 키로 넘긴다. */
export async function sendKakao(cfg: Solapi, to: string, templateId: string, variables: Record<string, string>): Promise<SendResult> {
  const auth = authHeader();
  if (!auth) return { ok: false, skipped: true, error: "이 환경에는 솔라피 키가 없어 보내지 않았습니다." };
  if (!cfg.pfId || !templateId || !cfg.sender) return { ok: false, skipped: true, error: "PFID·템플릿 ID·발신번호를 먼저 등록해 주세요." };
  const phone = digits(to);
  if (phone.length < 10) return { ok: false, error: `받는 번호가 올바르지 않습니다 (${to || "없음"}).` };

  const vars = Object.fromEntries(Object.entries(variables).map(([k, v]) => [`#{${k}}`, v]));
  try {
    const res = await fetch(`${API}/messages/v4/send`, {
      method: "POST",
      headers: { Authorization: auth, "content-type": "application/json" },
      body: JSON.stringify({ message: { to: phone, from: digits(cfg.sender), kakaoOptions: { pfId: cfg.pfId, templateId, variables: vars } } }),
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
  await report(`${adv.name} 광고주에게 문의 접수 알림톡`, await sendKakao(cfg, adv.phone, cfg.templateInquiry, inquiryVars(lead, asg)));
}

export const TASK_LABEL: Record<TaskKind, { name: string; path: string }> = {
  member: { name: "가입 승인", path: "/admin/members" },
  deposit: { name: "입금 확인", path: "/admin/deposits" },
  defect: { name: "불량 처리", path: "/admin/defects" },
  support: { name: "고객센터 문의", path: "/admin/support" },
};

const kstTime = (d = new Date()) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(5, 16).replace("-", "/").replace("T", " ");

export const taskVars = (kind: TaskKind, detail: string): Record<string, string> => ({
  구분: TASK_LABEL[kind].name,
  내용: clip(detail, 100),
  시각: kstTime(),
  url: `${host}${TASK_LABEL[kind].path}`,
});

/** 처리할 일이 새로 생겼을 때: 처리 알림톡(그 종류에 등록한 관리자 번호들) */
export async function notifyTask(s: State, kind: TaskKind, detail: string) {
  const cfg = s.settings.solapi;
  const phones = cfg.taskPhones?.[kind] ?? [];
  if (!cfg.enabled || !cfg.templateTask || !phones.length) return;
  const vars = taskVars(kind, detail);
  for (const to of phones) await report(`관리자 ${TASK_LABEL[kind].name} 알림톡`, await sendKakao(cfg, to, cfg.templateTask, vars));
}

export const chargedVars = (name: string, amount: number, balance: number): Record<string, string> => ({
  광고주명: name,
  충전금액: `${amount.toLocaleString()}원`,
  잔액: `${balance.toLocaleString()}원`,
  url: `${host}/app/wallet`,
});

/** 관리자가 입금을 확인했을 때: 충전 완료 알림톡(광고주) */
export async function notifyCharged(s: State, depositId: string) {
  const cfg = s.settings.solapi;
  if (!cfg.enabled || !cfg.templateCharged) return;
  const d = s.deposits.find((x) => x.id === depositId);
  const adv = d && s.advertisers.find((a) => a.id === d.advertiserId);
  if (!d || d.status !== "approved" || !adv) return;
  const balance = s.wallet.filter((t) => t.advertiserId === adv.id).reduce((n, t) => n + t.amount, 0);
  await report(`${adv.name} 광고주에게 충전 완료 알림톡`, await sendKakao(cfg, adv.phone, cfg.templateCharged, chargedVars(adv.name, d.amount, balance)));
}

/** 새 DB가 접수됐을 때: 통계 알림톡(관리자) */
export async function notifyStats(s: State, leadId: string) {
  const cfg = s.settings.solapi;
  if (!cfg.enabled || !cfg.statsEnabled || !cfg.statsPhone) return;
  const lead = s.leads.find((l) => l.id === leadId);
  if (!lead) return;
  await report("관리자 통계 알림톡", await sendKakao(cfg, cfg.statsPhone, cfg.templateStats, statsVars(s, lead)));
}
