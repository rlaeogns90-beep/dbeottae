"use client";

import Link from "next/link";
import { useAdvertiser } from "@/components/shells";
import { Badge, Card, Empty, Notice, PageHeader } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function DefectsPage() {
  const adv = useAdvertiser()!;
  const { state } = useStore();
  const mine = state.defects.filter((d) => state.assignments.find((a) => a.id === d.assignmentId)?.advertiserId === adv.id);

  return (
    <div>
      <PageHeader title="불량 처리 내역" />
      <div className="mb-4">
        <Notice>
          불량은 <b>결번만</b> 인정됩니다. 결번인 DB는 받은 뒤 <b>3시간 안에</b> DB 상세 화면에서 신청하세요. 통화 녹음은 없어도 됩니다. 지원팀이 승인하면 44,000원이 예치금으로 돌아옵니다.
        </Notice>
      </div>
      <Card>
        {mine.length === 0 ? (
          <Empty title="신청한 불량 처리가 없습니다" />
        ) : (
          <ul className="divide-y divide-line">
            {mine.map((d) => {
              const a = state.assignments.find((x) => x.id === d.assignmentId)!;
              const lead = state.leads.find((l) => l.id === a.leadId)!;
              return (
                <li key={d.id}>
                  <Link href={`/app/leads/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-page">
                    <div>
                      <p className="text-[15px] font-semibold">{lead.name} <span className="font-normal text-sub">· {lead.car}</span></p>
                      <p className="mt-0.5 text-[13px] text-sub">사유 {d.reason} · 신청 {dateTime(d.at)}</p>
                      {d.status === "rejected" && <p className="mt-1 text-[13px] text-bad">반려 사유: {d.rejectReason}</p>}
                    </div>
                    {d.status === "pending" && <Badge tone="orange">검토 중</Badge>}
                    {d.status === "approved" && <Badge tone="blue">승인 · 44,000원 환원</Badge>}
                    {d.status === "rejected" && <Badge tone="red">반려</Badge>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
