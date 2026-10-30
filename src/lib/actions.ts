// 화면에서 하는 모든 변경 작업. 브라우저(미리 반영)와 서버(실제 저장)가 같은 함수를 쓰고,
// 서버에서는 이 함수가 권한까지 확인한 결과만 저장한다.
import { isIndustry } from "./content";
import { assign, checkAdvertiser, minChargeOf, priceOf, reopenAt, routeLead, uid } from "./engine";
import type { Advertiser, Assignment, DefectReason, Lead, MemberStatus, Session, Settings, State, TaskKind } from "./types";

export type Action =
  // 광고주 본인
  | { type: "setReceiving"; advertiserId: string; on: boolean }
  | { type: "requestDeposit"; advertiserId: string; amount: number; depositor: string }
  | { type: "updateAssignment"; id: string; patch: Partial<Pick<Assignment, "consult" | "memo">> }
  | { type: "reportDefect"; assignmentId: string; reason: DefectReason; fileName?: string }
  // 관리자
  | { type: "approveMember"; kind: "advertiser" | "partner"; id: string; ok: boolean }
  | { type: "setMemberStatus"; kind: "advertiser" | "partner"; id: string; status: MemberStatus }
  | { type: "handleDeposit"; id: string; ok: boolean }
  | { type: "setReceiptStatus"; depositId: string; issued: boolean }
  | { type: "handleDefect"; id: string; ok: boolean; rejectReason?: string }
  | { type: "assignWaiting"; leadId: string; advertiserId: string }
  | { type: "assignWaitingToGroup"; leadId: string; groupId: string }
  | { type: "simulateLead"; lead: Lead }
  | { type: "deleteLead"; id: string }
  | { type: "updateAdvertiser"; id: string; patch: Partial<Advertiser> }
  | { type: "adjustWallet"; advertiserId: string; amount: number; note: string }
  | { type: "updateSettings"; patch: Partial<Settings> }
  | { type: "addGroup" }
  | { type: "removeGroup"; id: string }
  | { type: "setGroupAdvertiser"; groupId: string; advertiserId?: string }
  | { type: "moveGroup"; groupId: string; dir: -1 | 1 }
  | { type: "createPartner"; loginId: string; password: string; name: string; phone: string }
  | { type: "setPassword"; kind: "advertiser" | "partner" | "admin"; id: string; password: string }
  // 마스터 관리자
  | { type: "createAdmin"; loginId: string; password: string; name: string }
  | { type: "deleteAdmin"; id: string };

export type ActionResult = { state: State } | { error: string };

const ADVERTISER_ACTIONS = new Set<Action["type"]>(["setReceiving", "requestDeposit", "updateAssignment", "reportDefect"]);
const MASTER_ACTIONS = new Set<Action["type"]>(["createAdmin", "deleteAdmin"]);

export const MIN_PASSWORD = 4;

const CONSULT_VALUES = ["대기", "견적발송", "계약", "관리", "계약취소"];
export const LOGIN_ID = /^[a-zA-Z0-9_]{4,20}$/;
const str = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
const money = (v: unknown) => typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= 100_000_000;

/** 값의 형식과 길이 검사. 화면을 거치지 않고 직접 보낸 요청도 여기서 걸러진다. */
function invalid(a: Action): string | null {
  switch (a.type) {
    case "setReceiving":
      return typeof a.on === "boolean" ? null : "잘못된 요청입니다.";
    case "requestDeposit":
      return money(a.amount) && a.amount > 0 && str(a.depositor, 30) && a.depositor.trim() ? null : "입금 금액과 입금자명을 확인해 주세요.";
    case "updateAssignment":
      if (a.patch.consult !== undefined && !CONSULT_VALUES.includes(a.patch.consult)) return "잘못된 상담 상태입니다.";
      return a.patch.memo === undefined || str(a.patch.memo, 2000) ? null : "메모는 2,000자까지 쓸 수 있습니다.";
    case "reportDefect":
      return a.reason === "결번" && (a.fileName === undefined || str(a.fileName, 200)) ? null : "잘못된 요청입니다.";
    case "setReceiptStatus":
      return typeof a.depositId === "string" && typeof a.issued === "boolean" ? null : "잘못된 요청입니다.";
    case "handleDefect":
      return a.rejectReason === undefined || str(a.rejectReason, 200) ? null : "반려 사유는 200자까지 쓸 수 있습니다.";
    case "deleteLead":
      return str(a.id, 60) ? null : "잘못된 요청입니다.";
    case "adjustWallet":
      return money(a.amount) && str(a.note, 200) ? null : "조정 금액과 사유를 확인해 주세요.";
    case "simulateLead":
      return str(a.lead.name, 50) && str(a.lead.phone, 20) && str(a.lead.car ?? "", 100) ? null : "잘못된 요청입니다.";
    case "createPartner":
    case "createAdmin":
      if (!LOGIN_ID.test(a.loginId)) return "아이디는 영문·숫자·밑줄 4~20자로 정해 주세요.";
      return str(a.name, 50) && str(a.password, 100) && (a.type === "createAdmin" || str(a.phone, 20)) ? null : "입력값을 확인해 주세요.";
    case "setPassword":
      return str(a.password, 100) ? null : "비밀번호가 너무 깁니다.";
    default:
      return null;
  }
}

export const TASK_KINDS: TaskKind[] = ["member", "deposit", "defect", "support"];
export const MAX_TASK_PHONES = 3;

/** 처리 알림 번호: 정해진 종류만, 종류마다 숫자 10~11자리 번호 최대 3개 */
function taskPhonesOf(v: object): Partial<Record<TaskKind, string[]>> {
  const src = v as Record<string, unknown>;
  return Object.fromEntries(
    TASK_KINDS.map((k) => [
      k,
      (Array.isArray(src[k]) ? src[k] : [])
        .filter((p): p is string => typeof p === "string" && /^\d{10,11}$/.test(p.replace(/\D/g, "")))
        .map((p) => p.trim())
        .slice(0, MAX_TASK_PHONES),
    ]),
  );
}

const loginIdTaken =(s: State, loginId: string) =>
  [...s.advertisers, ...s.partners, ...s.admins].some((u) => u.loginId === loginId);

/** 누가 어떤 작업을 할 수 있는지 */
function denied(s: State, who: Session, a: Action): string | null {
  if (who.role === "partner") return "영업자 계정은 변경할 수 없습니다.";
  if (who.role === "advertiser") {
    if (!ADVERTISER_ACTIONS.has(a.type)) return "권한이 없습니다.";
    const mine = (assignmentId: string) => s.assignments.find((x) => x.id === assignmentId)?.advertiserId === who.id;
    if ((a.type === "setReceiving" || a.type === "requestDeposit") && a.advertiserId !== who.id) return "권한이 없습니다.";
    if (a.type === "updateAssignment" && !mine(a.id)) return "권한이 없습니다.";
    if (a.type === "reportDefect" && !mine(a.assignmentId)) return "권한이 없습니다.";
    return null;
  }
  const admin = s.admins.find((x) => x.id === who.id);
  if (!admin) return "권한이 없습니다.";
  if (MASTER_ACTIONS.has(a.type) && !admin.master) return "마스터 관리자만 할 수 있습니다.";
  if (a.type === "setPassword" && a.kind === "admin" && a.id !== who.id && !admin.master) return "다른 관리자의 비밀번호는 마스터만 바꿀 수 있습니다.";
  return null;
}

export function runAction(s: State, who: Session, a: Action, now = new Date()): ActionResult {
  const no = denied(s, who, a) ?? invalid(a);
  if (no) return { error: no };
  const at = now.toISOString();
  const ok = (state: State): ActionResult => ({ state });

  switch (a.type) {
    case "setReceiving": {
      const adv = s.advertisers.find((x) => x.id === a.advertiserId);
      if (!adv) return { error: "광고주를 찾을 수 없습니다." };
      if (a.on) {
        const until = reopenAt(s, adv);
        if (until && until > now) return { error: "OFF 후 24시간이 지나야 다시 켤 수 있습니다." };
        const bal = s.wallet.filter((t) => t.advertiserId === adv.id).reduce((n, t) => n + t.amount, 0);
        if (bal < priceOf(s, adv.industry)) return { error: "예치금이 부족합니다. 충전 후 다시 켜 주세요." };
      }
      return ok({
        ...s,
        advertisers: s.advertisers.map((x) =>
          x.id === adv.id
            ? a.on
              ? { ...x, receiving: true, offAt: undefined, offBy: undefined }
              : { ...x, receiving: false, offAt: at, offBy: "self" }
            : x,
        ),
      });
    }
    case "requestDeposit": {
      const min = minChargeOf(s, s.advertisers.find((x) => x.id === a.advertiserId)?.industry);
      if (!(a.amount >= min)) return { error: `최소 충전 금액은 ${min.toLocaleString()}원입니다.` };
      return ok({ ...s, deposits: [{ id: uid("dp"), advertiserId: a.advertiserId, amount: a.amount, depositor: a.depositor, at, status: "pending" }, ...s.deposits] });
    }
    case "updateAssignment": {
      const patch: Partial<Assignment> = {};
      if (a.patch.consult !== undefined) patch.consult = a.patch.consult;
      if (a.patch.memo !== undefined) patch.memo = String(a.patch.memo).slice(0, 2000);
      return ok({ ...s, assignments: s.assignments.map((x) => (x.id === a.id ? { ...x, ...patch } : x)) });
    }
    case "reportDefect": {
      const asg = s.assignments.find((x) => x.id === a.assignmentId);
      if (!asg) return { error: "DB를 찾을 수 없습니다." };
      // 결번은 받은 시점과 상관없이 언제든 신청할 수 있다.
      if (s.defects.some((d) => d.assignmentId === asg.id && d.status !== "rejected")) return { error: "이미 신청한 DB입니다." };
      return ok({ ...s, defects: [{ id: uid("df"), assignmentId: asg.id, reason: "결번", fileName: a.fileName || undefined, at, status: "pending" }, ...s.defects] });
    }
    case "approveMember": {
      const status: MemberStatus = a.ok ? "approved" : "rejected";
      if (a.kind === "partner") return ok({ ...s, partners: s.partners.map((x) => (x.id === a.id ? { ...x, status } : x)) });
      // 광고주를 승인하면 그룹 순번에 자동으로 넣는다: 빈 그룹이 있으면 그 자리, 없으면 맨 뒤에 새 그룹.
      let groups = s.groups;
      if (a.ok && !groups.some((g) => g.advertiserId === a.id)) {
        const empty = groups.find((g) => !g.advertiserId);
        groups = empty ? groups.map((g) => (g.id === empty.id ? { ...g, advertiserId: a.id } : g)) : [...groups, { id: uid("g"), advertiserId: a.id }];
      }
      return ok({ ...s, groups, advertisers: s.advertisers.map((x) => (x.id === a.id ? { ...x, status } : x)) });
    }
    case "setMemberStatus":
      return ok(
        a.kind === "advertiser"
          ? { ...s, advertisers: s.advertisers.map((x) => (x.id === a.id ? { ...x, status: a.status, receiving: a.status === "approved" ? x.receiving : false } : x)) }
          : { ...s, partners: s.partners.map((x) => (x.id === a.id ? { ...x, status: a.status } : x)) },
      );
    case "handleDeposit": {
      const d = s.deposits.find((x) => x.id === a.id);
      if (!d) return { error: "입금 요청을 찾을 수 없습니다." };
      if (d.status !== "pending") return { error: "이미 처리한 입금 요청입니다." };
      return ok({
        ...s,
        // 입금이 확인되면 증빙(세금계산서·현금영수증)은 '대기'로 시작한다.
        deposits: s.deposits.map((x) => (x.id === a.id ? { ...x, status: a.ok ? "approved" : "rejected", handledAt: at, receipt: a.ok ? { status: "pending" } : undefined } : x)),
        wallet: a.ok ? [{ id: uid("tx"), advertiserId: d.advertiserId, type: "charge", amount: d.amount, at, note: "예치금 충전", depositId: d.id }, ...s.wallet] : s.wallet,
      });
    }
    case "setReceiptStatus": {
      const d = s.deposits.find((x) => x.id === a.depositId);
      if (!d) return { error: "입금 건을 찾을 수 없습니다." };
      if (d.status !== "approved") return { error: "입금이 확인된 건만 발행 상태를 바꿀 수 있습니다." };
      const receipt = { ...d.receipt, status: a.issued ? "issued" : "pending", issuedAt: a.issued ? (d.receipt?.issuedAt ?? at) : undefined } as NonNullable<typeof d.receipt>;
      return ok({ ...s, deposits: s.deposits.map((x) => (x.id === d.id ? { ...x, receipt } : x)) });
    }
    case "handleDefect": {
      const d = s.defects.find((x) => x.id === a.id);
      if (!d) return { error: "불량 신청을 찾을 수 없습니다." };
      if (d.status !== "pending") return { error: "이미 처리한 불량 신청입니다." };
      const asg = s.assignments.find((x) => x.id === d.assignmentId)!;
      const lead = s.leads.find((l) => l.id === asg.leadId)!;
      return ok({
        ...s,
        defects: s.defects.map((x) => (x.id === a.id ? { ...x, status: a.ok ? "approved" : "rejected", rejectReason: a.rejectReason, handledAt: at } : x)),
        leads: a.ok ? s.leads.map((l) => (l.id === lead.id ? { ...l, status: "defect" } : l)) : s.leads,
        wallet: a.ok
          ? [{ id: uid("tx"), advertiserId: asg.advertiserId, type: "refund", amount: asg.amount, at, note: `결번 환급 · ${lead.name}` }, ...s.wallet]
          : s.wallet,
      });
    }
    case "assignWaiting":
    case "assignWaitingToGroup": {
      const advertiserId = a.type === "assignWaiting" ? a.advertiserId : s.groups.find((g) => g.id === a.groupId)?.advertiserId;
      if (!advertiserId) return { error: "광고주가 들어 있지 않은 그룹입니다." };
      const lead = s.leads.find((l) => l.id === a.leadId);
      const adv = s.advertisers.find((x) => x.id === advertiserId);
      if (!lead || !adv) return { error: "DB 또는 광고주를 찾을 수 없습니다." };
      if (lead.status !== "waiting") return { error: "이미 배정된 DB입니다." };
      // 관리자 배정은 하루 한도와 수신 OFF는 넘길 수 있지만, 업종·잔액·같은 번호 규칙은 지킨다.
      const why = checkAdvertiser(s, adv, { ...lead, groupId: undefined }, now);
      if (why === "industry") return { error: "업종이 다른 광고주에게는 배정할 수 없습니다." };
      if (why === "balance") return { error: "이 광고주는 예치금이 부족합니다." };
      if (why === "duplicate") return { error: "이 광고주는 같은 번호를 이미 받았습니다." };
      if (why === "status") return { error: "승인된 광고주가 아닙니다." };
      return ok(assign(s, lead.id, adv.id, "admin", now));
    }
    case "simulateLead":
      return ok(routeLead(s, { ...a.lead, id: uid("ld"), createdAt: at, status: "waiting" }, now));
    case "deleteLead": {
      const lead = s.leads.find((l) => l.id === a.id);
      if (!lead) return { error: "DB를 찾을 수 없습니다." };
      const asgs = s.assignments.filter((x) => x.leadId === lead.id);
      const asgIds = new Set(asgs.map((x) => x.id));
      // 이미 결번 환급이 끝난 배정은 다시 환급하지 않는다. 나머지는 배정 때 차감한 금액을 돌려준다.
      const refunded = new Set(s.defects.filter((d) => d.status === "approved").map((d) => d.assignmentId));
      const refunds = asgs
        .filter((x) => !refunded.has(x.id))
        .map((x) => ({ id: uid("tx"), advertiserId: x.advertiserId, type: "refund" as const, amount: x.amount, at, note: `DB 삭제 환급 · ${lead.name}` }));
      return ok({
        ...s,
        leads: s.leads.filter((l) => l.id !== lead.id),
        assignments: s.assignments.filter((x) => x.leadId !== lead.id),
        defects: s.defects.filter((d) => !asgIds.has(d.assignmentId)),
        wallet: [...refunds, ...s.wallet],
      });
    }
    case "updateAdvertiser": {
      // 아이디·비밀번호·가입 정보는 이 작업으로 바꾸지 않는다.
      // 관리자가 바꿀 수 있는 항목만 받는다 (아이디·비밀번호·가입 정보는 이 작업으로 바꾸지 않는다).
      const allowed = ["name", "phone", "company", "industry", "referrer", "tax", "receiving", "offAt", "offBy"] as const;
      const patch: Partial<Advertiser> = {};
      for (const k of allowed) if (k in a.patch) (patch as Record<string, unknown>)[k] = a.patch[k];
      if ((patch.name !== undefined && !str(patch.name, 50)) || (patch.phone !== undefined && !str(patch.phone, 20)) || (patch.industry !== undefined && !isIndustry(patch.industry))) return { error: "입력값을 확인해 주세요." };
      return ok({ ...s, advertisers: s.advertisers.map((x) => (x.id === a.id ? { ...x, ...patch } : x)) });
    }
    case "adjustWallet":
      if (!Number.isFinite(a.amount) || a.amount === 0) return { error: "조정 금액을 입력해 주세요." };
      return ok({ ...s, wallet: [{ id: uid("tx"), advertiserId: a.advertiserId, type: "adjust", amount: a.amount, at, note: `관리자 조정 · ${a.note}` }, ...s.wallet] });
    case "updateSettings": {
      const patch = { ...a.patch };
      // 솔라피는 허용한 항목만 글자 수를 확인해 받는다 (API Key·Secret은 여기서 받지 않는다).
      if (patch.solapi) {
        const p = patch.solapi as Partial<State["settings"]["solapi"]>;
        const cur = s.settings.solapi;
        const t = (v: unknown, fallback: string, max = 80) => (typeof v === "string" && v.length <= max ? v.trim() : fallback);
        patch.solapi = {
          channel: t(p.channel, cur.channel, 50), pfId: t(p.pfId, cur.pfId, 60), sender: t(p.sender, cur.sender, 20),
          templateInquiry: t(p.templateInquiry, cur.templateInquiry), templateStats: t(p.templateStats, cur.templateStats), statsPhone: t(p.statsPhone, cur.statsPhone, 20),
          enabled: typeof p.enabled === "boolean" ? p.enabled : cur.enabled, statsEnabled: typeof p.statsEnabled === "boolean" ? p.statsEnabled : cur.statsEnabled,
          templateTask: t(p.templateTask, cur.templateTask ?? ""), templateCharged: t(p.templateCharged, cur.templateCharged ?? ""),
          taskPhones: p.taskPhones && typeof p.taskPhones === "object" ? taskPhonesOf(p.taskPhones) : cur.taskPhones,
        };
      }
      // 연결의 업종은 정해진 업종 이름만 받는다 (그 밖의 값은 비워서 신차 장기렌트로 본다).
      if (Array.isArray(patch.connections))
        patch.connections = patch.connections.map((c) => ({ ...c, industry: isIndustry(c.industry) ? c.industry : undefined }));
      return ok({ ...s, settings: { ...s.settings, ...patch } });
    }
    case "addGroup":
      return ok({ ...s, groups: [...s.groups, { id: uid("g") }] });
    case "removeGroup":
      return ok({ ...s, groups: s.groups.filter((g) => g.id !== a.id) });
    case "setGroupAdvertiser":
      // 한 광고주는 그룹 하나에만: 다른 그룹에 있던 자리는 비운다.
      return ok({
        ...s,
        groups: s.groups.map((g) =>
          g.id === a.groupId ? { ...g, advertiserId: a.advertiserId } : g.advertiserId === a.advertiserId ? { ...g, advertiserId: undefined } : g,
        ),
      });
    case "moveGroup": {
      const i = s.groups.findIndex((g) => g.id === a.groupId);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= s.groups.length) return ok(s);
      const groups = [...s.groups];
      [groups[i], groups[j]] = [groups[j], groups[i]];
      return ok({ ...s, groups });
    }
    case "createPartner":
      if (loginIdTaken(s, a.loginId)) return { error: "이미 사용 중인 아이디입니다." };
      if (a.password.length < MIN_PASSWORD) return { error: `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.` };
      return ok({
        ...s,
        partners: [...s.partners, { id: uid("pt"), loginId: a.loginId, password: a.password, name: a.name, phone: a.phone, code: a.loginId.toUpperCase(), status: "approved", createdAt: at }],
      });
    case "createAdmin":
      if (loginIdTaken(s, a.loginId)) return { error: "이미 사용 중인 아이디입니다." };
      if (a.password.length < MIN_PASSWORD) return { error: `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.` };
      return ok({ ...s, admins: [...s.admins, { id: uid("ad"), loginId: a.loginId, password: a.password, name: a.name, master: false, createdAt: at }] });
    case "deleteAdmin":
      return ok({ ...s, admins: s.admins.filter((x) => x.id !== a.id || x.master) });
    case "setPassword": {
      if (a.password.length < MIN_PASSWORD) return { error: `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.` };
      // 비밀번호를 바꾸면 토큰 버전을 올려 그 계정의 기존 로그인을 모두 끊는다.
      const set = <T extends { id: string; password: string; tv?: number }>(list: T[]) =>
        list.map((u) => (u.id === a.id ? { ...u, password: a.password, tv: (u.tv ?? 0) + 1 } : u));
      if (a.kind === "advertiser") return ok({ ...s, advertisers: set(s.advertisers) });
      if (a.kind === "partner") return ok({ ...s, partners: set(s.partners) });
      return ok({ ...s, admins: set(s.admins) });
    }
  }
}
