"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { defectDeadline } from "@/lib/engine";
import { remaining, timeAgo } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Assignment, ConsultStatus, Lead } from "@/lib/types";
import { Badge } from "./ui";

export const CONSULTS: ConsultStatus[] = ["대기", "견적발송", "계약", "관리", "계약취소"];

export const consultTone: Record<ConsultStatus, "gray" | "blue" | "green" | "orange" | "red"> = {
  대기: "blue",
  견적발송: "orange",
  계약: "green",
  관리: "gray",
  계약취소: "red",
};

/** 차종 · 개월수 (개월수는 있을 때만) */
export const carLine = (l: Lead) => [l.car || "차종 미입력", l.months ? `${l.months}개월` : ""].filter(Boolean).join(" · ");

export function useDefectState(a?: Assignment) {
  const { state, now } = useStore();
  if (!a) return { report: undefined, left: null };
  const report = state.defects.find((d) => d.assignmentId === a.id && d.status !== "rejected")
    ?? state.defects.find((d) => d.assignmentId === a.id);
  const left = remaining(defectDeadline(state, a), now);
  return { report, left };
}

export function DefectBadge({ a }: { a: Assignment }) {
  const { report, left } = useDefectState(a);
  if (report?.status === "pending") return <Badge tone="orange">불량 검토 중</Badge>;
  if (report?.status === "approved") return <Badge tone="red">불량 · 환원 완료</Badge>;
  if (report?.status === "rejected") return <Badge>불량 반려</Badge>;
  if (left) return <span className="tabular text-xs text-mute">불량 신청 {left} 남음</span>;
  return null;
}

export function LeadRow({ a }: { a: Assignment }) {
  const { state, now } = useStore();
  const lead = state.leads.find((l) => l.id === a.leadId)!;
  return (
    <Link href={`/app/leads/${a.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-page">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold">{lead.name}</span>
          <span className="tabular text-sm text-sub">{lead.phone}</span>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-sub">{carLine(lead)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge tone={consultTone[a.consult]}>{a.consult}</Badge>
          <DefectBadge a={a} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-xs text-mute">
        {timeAgo(a.assignedAt, now)}
        <ChevronRight size={16} />
      </div>
    </Link>
  );
}
