import { DEFAULT_INDUSTRY, laneOf } from "./content";
import type { Assignment, State } from "./types";

/** 건별 수익 = DB 단가 − 실행사 원가 (VAT 포함). 신차 44,000 − 35,000. 오토바이는 원가가 정해지지 않아 0원. */
export const DB_MARGIN: Record<string, number> = { [DEFAULT_INDUSTRY]: 9000 };
/** 영업자 인센티브율: 건별 수익의 40% */
export const INCENTIVE_RATE = 0.4;
export const marginOf = (industry?: string) => DB_MARGIN[laneOf(industry)] ?? 0;
export const incentiveOf = (industry?: string) => Math.round(marginOf(industry) * INCENTIVE_RATE);

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
  /** 건별 수익 합계 (DB어때 몫, 인센티브 떼기 전) */
  margin: number;
  /** 영업자 인센티브 = 건별 수익 × 40% */
  income: number;
}

/**
 * 영업자 실적. 결제 = 추천 광고주가 DB를 1건 받아 예치금에서 차감된 것.
 * 결번으로 환급된 건은 결제에서 뺀다. 인센티브 = 건별 수익 × 40% (광고주 업종 기준).
 */
export function partnerStats(s: State, code: string, month = monthKey(new Date())) {
  const advertisers = s.advertisers.filter((a) => a.referrer === code);
  const ids = new Set(advertisers.map((a) => a.id));
  const industry = new Map(advertisers.map((a) => [a.id, a.industry]));
  const refunded = new Set(s.defects.filter((d) => d.status === "approved").map((d) => d.assignmentId));
  const paid: Assignment[] = s.assignments
    .filter((a) => ids.has(a.advertiserId) && !refunded.has(a.id))
    .sort((x, y) => y.assignedAt.localeCompare(x.assignedAt));

  const row = (list: Assignment[]): Omit<MonthRow, "month"> => ({
    count: list.length,
    amount: list.reduce((n, a) => n + a.amount, 0),
    margin: list.reduce((n, a) => n + marginOf(industry.get(a.advertiserId)), 0),
    income: list.reduce((n, a) => n + incentiveOf(industry.get(a.advertiserId)), 0),
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
