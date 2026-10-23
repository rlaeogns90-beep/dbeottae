// DB 배정 규칙. 기획서 "DB 자동 배정 엔진" 섹션을 그대로 옮긴 순수 함수들이라
// 나중에 서버로 옮겨도 같은 코드를 쓸 수 있다.
import type { Advertiser, Assignment, Lead, State, WalletTx } from "./types";

export const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export const balanceOf = (s: State, advertiserId: string) =>
  s.wallet.filter((t) => t.advertiserId === advertiserId).reduce((sum, t) => sum + t.amount, 0);

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const todayCount = (s: State, advertiserId: string, now = new Date()) =>
  s.assignments.filter((a) => a.advertiserId === advertiserId && sameDay(new Date(a.assignedAt), now)).length;

export const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/** 수동 OFF 후 다시 켤 수 있는 시각. 자동 OFF(예치금 소진)는 제한 없음. */
export const reopenAt = (s: State, adv: Advertiser) =>
  adv.offBy === "self" && adv.offAt
    ? new Date(new Date(adv.offAt).getTime() + s.settings.offLockHours * 3600_000)
    : null;

export const hasReceivedPhone = (s: State, advertiserId: string, phone: string) =>
  s.assignments.some(
    (a) => a.advertiserId === advertiserId && s.leads.find((l) => l.id === a.leadId)?.phone === phone,
  );

/** 광고주가 들어 있는 그룹 (한 광고주는 그룹 하나에만 들어간다) */
export const groupOf = (s: State, advertiserId: string) => s.groups.find((g) => g.advertiserId === advertiserId);

/** 그룹 번호: 1번부터 */
export const groupNo = (s: State, groupId: string) => s.groups.findIndex((g) => g.id === groupId) + 1;

export type Ineligible = "off" | "balance" | "limit" | "duplicate" | "group" | "status";

export function checkAdvertiser(s: State, adv: Advertiser, lead: Lead, now: Date): Ineligible | null {
  if (adv.status !== "approved") return "status";
  if (lead.groupId && groupOf(s, adv.id)?.id !== lead.groupId) return "group";
  if (!adv.receiving) return "off";
  if (balanceOf(s, adv.id) < s.settings.price) return "balance";
  if (hasReceivedPhone(s, adv.id, lead.phone)) return "duplicate";
  if (todayCount(s, adv.id, now) >= s.settings.dailyLimit) return "limit";
  return null;
}

/** 배정 1건: 차감, 기록, 잔액 소진 시 자동 OFF까지 한 번에 처리 */
export function assign(
  s: State,
  leadId: string,
  advertiserId: string,
  method: Assignment["method"],
  now = new Date(),
): State {
  const at = now.toISOString();
  const lead = s.leads.find((l) => l.id === leadId)!;
  const assignment: Assignment = {
    id: uid("as"),
    leadId,
    advertiserId,
    assignedAt: at,
    method,
    amount: s.settings.price,
    consult: "대기",
    memo: "",
  };
  const debit: WalletTx = {
    id: uid("tx"),
    advertiserId,
    type: "debit",
    amount: -s.settings.price,
    at,
    note: `DB 배정 · ${lead.name} ${lead.car}`,
  };
  let next: State = {
    ...s,
    assignments: [assignment, ...s.assignments],
    wallet: [debit, ...s.wallet],
    leads: s.leads.map((l) => (l.id === leadId ? { ...l, status: "assigned", waitReason: undefined } : l)),
    advertisers: s.advertisers.map((a) => (a.id === advertiserId ? { ...a, lastAssignedAt: at } : a)),
  };
  if (balanceOf(next, advertiserId) < s.settings.price) {
    next = {
      ...next,
      advertisers: next.advertisers.map((a) =>
        a.id === advertiserId ? { ...a, receiving: false, offAt: at, offBy: "auto" } : a,
      ),
    };
  }
  return next;
}

/** 새로 접수된 DB를 규칙대로 배정하거나 관리자 대기로 보낸다. */
export function routeLead(s: State, lead: Lead, now = new Date()): State {
  const withLead: State = { ...s, leads: [lead, ...s.leads] };
  const wait = (reason: string): State => ({
    ...withLead,
    leads: withLead.leads.map((l) => (l.id === lead.id ? { ...l, status: "waiting", waitReason: reason } : l)),
  });

  if (s.settings.paused) return wait("배정 일시정지");
  if (s.settings.weekendStop && isWeekend(now)) return wait("주말 접수");

  // 그룹 순번: 마지막으로 배정한 그룹의 다음 번호부터 1번 그룹 쪽으로 돌아가며 찾는다.
  const slots = s.groups.filter((g) => g.advertiserId);
  const last = slots.findIndex((g) => g.id === s.settings.lastGroupId);
  const ordered = lead.groupId
    ? slots.filter((g) => g.id === lead.groupId)
    : [...slots.slice(last + 1), ...slots.slice(0, last + 1)];

  let capped = false;
  for (const slot of ordered) {
    const adv = s.advertisers.find((a) => a.id === slot.advertiserId);
    if (!adv) continue;
    const why = checkAdvertiser(withLead, adv, lead, now);
    if (why === "limit") capped = true;
    if (why) continue;
    const next = assign(withLead, lead.id, adv.id, "auto", now);
    return { ...next, settings: { ...next.settings, lastGroupId: slot.id } };
  }

  if (slots.length === 0) return wait("배정 그룹 없음");
  return wait(capped ? "하루 한도 초과" : "배정 가능한 광고주 없음");
}

export const defectDeadline = (s: State, a: Assignment) =>
  new Date(new Date(a.assignedAt).getTime() + s.settings.defectHours * 3600_000);
