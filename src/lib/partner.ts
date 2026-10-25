import type { Assignment, State } from "./types";

export const monthKey = (iso: string | Date) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return `${y}년 ${Number(m)}월`;
};

export interface MonthRow {
  month: string;
  count: number;
  amount: number;
  income: number;
}

/**
 * 영업자 실적. 결제 = 추천 광고주가 DB를 1건 받아 예치금에서 차감된 것.
 * 결번으로 환급된 건은 결제에서 뺀다. 수익 = 결제 건수 × 건당 수익.
 */
export function partnerStats(s: State, code: string, month = monthKey(new Date())) {
  const advertisers = s.advertisers.filter((a) => a.referrer === code);
  const ids = new Set(advertisers.map((a) => a.id));
  const refunded = new Set(s.defects.filter((d) => d.status === "approved").map((d) => d.assignmentId));
  const paid: Assignment[] = s.assignments
    .filter((a) => ids.has(a.advertiserId) && !refunded.has(a.id))
    .sort((x, y) => y.assignedAt.localeCompare(x.assignedAt));

  const row = (list: Assignment[]): Omit<MonthRow, "month"> => ({
    count: list.length,
    amount: list.reduce((n, a) => n + a.amount, 0),
    income: list.length * s.settings.incentivePerDb,
  });

  const byMonth = new Map<string, Assignment[]>();
  for (const a of paid) {
    const k = monthKey(a.assignedAt);
    byMonth.set(k, [...(byMonth.get(k) ?? []), a]);
  }
  const current = monthKey(new Date());
  if (!byMonth.has(current)) byMonth.set(current, []);
  const months: MonthRow[] = [...byMonth.entries()]
    .map(([k, list]) => ({ month: k, ...row(list) }))
    .sort((x, y) => y.month.localeCompare(x.month));

  const inMonth = paid.filter((a) => monthKey(a.assignedAt) === month);
  return {
    advertisers,
    approved: advertisers.filter((a) => a.status === "approved").length,
    pending: advertisers.filter((a) => a.status === "pending").length,
    paid,
    inMonth,
    months,
    total: row(paid),
    selected: row(inMonth),
  };
}
