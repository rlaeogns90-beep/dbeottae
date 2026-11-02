// 관리자 DB 현황의 날짜·검색 필터. 날짜는 서버(UTC)에서 돌아도 한국 날짜 기준이 되도록 +9시간 옮겨 비교한다.
import type { Lead } from "./types";

const DAY = 86_400_000;
const kstDay = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);

/** 한국 날짜 "YYYY-MM-DD" */
export const kstDate = (iso: string) => kstDay(new Date(iso));

export type QuickRange = "today" | "yesterday" | "week" | "month";

/** 빠른 버튼: 오늘, 어제, 최근 7일(오늘 포함), 이번 달 */
export function quickRange(kind: QuickRange, now = new Date()): { from: string; to: string } {
  const today = kstDay(now);
  if (kind === "yesterday") {
    const y = kstDay(new Date(now.getTime() - DAY));
    return { from: y, to: y };
  }
  if (kind === "week") return { from: kstDay(new Date(now.getTime() - 6 * DAY)), to: today };
  if (kind === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  return { from: today, to: today };
}

const digits = (v: string) => v.replace(/\D/g, "");

/** 검색어(이름·연락처·차종)와 접수 날짜 범위(양 끝 포함)에 맞는지. 연락처는 숫자만 비교한다. */
export function matchLead(l: Pick<Lead, "name" | "phone" | "car" | "createdAt">, f: { q: string; from: string; to: string }) {
  const day = kstDate(l.createdAt);
  if (f.from && day < f.from) return false;
  if (f.to && day > f.to) return false;
  const q = f.q.trim().toLowerCase();
  if (!q) return true;
  const qd = digits(q);
  return (
    l.name.toLowerCase().includes(q) ||
    (l.car ?? "").toLowerCase().includes(q) ||
    (qd.length >= 3 && digits(l.phone).includes(qd))
  );
}
