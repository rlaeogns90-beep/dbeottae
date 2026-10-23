"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { CONSULTS, LeadRow } from "@/components/lead-parts";
import { useAdvertiser } from "@/components/shells";
import { Button, Card, cx, Empty, PageHeader } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ConsultStatus } from "@/lib/types";

const filters: ("전체" | ConsultStatus)[] = ["전체", ...CONSULTS];

export default function LeadsPage() {
  const adv = useAdvertiser()!;
  const { state } = useStore();
  const [filter, setFilter] = useState<(typeof filters)[number]>("전체");
  const mine = state.assignments.filter((a) => a.advertiserId === adv.id);
  const list = filter === "전체" ? mine : mine.filter((a) => a.consult === filter);

  const download = () => {
    const rows = [["수신 시각", "이름", "연락처", "브랜드", "차종", "개월수", "상담 상태", "메모"]];
    for (const a of mine) {
      const l = state.leads.find((x) => x.id === a.leadId)!;
      rows.push([dateTime(a.assignedAt), l.name, l.phone, l.brand, l.car, `${l.months}`, a.consult, a.memo]);
    }
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "DB관리.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="DB 관리"
        desc={`총 ${mine.length}건 · 새 DB는 새로고침 없이 바로 표시됩니다`}
        action={<Button variant="secondary" size="sm" onClick={download}><Download size={15} /> 엑셀 받기</Button>}
      />
      <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((f) => {
          const n = f === "전체" ? mine.length : mine.filter((a) => a.consult === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cx(
                "h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold",
                filter === f ? "bg-ink text-white" : "border border-line bg-white text-sub",
              )}
            >
              {f} {n}
            </button>
          );
        })}
      </div>
      <Card>
        {list.length === 0 ? (
          <Empty title="해당하는 DB가 없습니다" />
        ) : (
          <div className="divide-y divide-line">{list.map((a) => <LeadRow key={a.id} a={a} />)}</div>
        )}
      </Card>
    </div>
  );
}
