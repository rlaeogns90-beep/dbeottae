"use client";

import { useState } from "react";
import { Badge, Button, Card, Empty, PageHeader, Select, Table, td, th } from "@/components/ui";
import { won } from "@/lib/format";
import { monthKey, monthLabel, partnerStats } from "@/lib/partner";
import { useStore } from "@/lib/store";

export default function AdminPartners() {
  const { state, setMemberStatus } = useStore();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const list = state.partners.filter((p) => p.status !== "pending" && p.status !== "rejected");
  const months = [...new Set([monthKey(new Date()), ...state.assignments.map((a) => monthKey(a.assignedAt))])].sort().reverse();

  return (
    <div>
      <PageHeader
        title="영업자 · 인센티브"
        desc={`추천 광고주의 DB 1건당 ${won(state.settings.incentivePerDb)}이 영업자 수익으로 쌓입니다 (불량 환원 건 제외)`}
        action={
          <div className="w-40">
            <Select className="h-10" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </Select>
          </div>
        }
      />
      <Card>
        {list.length === 0 ? (
          <Empty title="영업자가 없습니다" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>영업자</th>
                <th className={th}>추천 코드</th>
                <th className={`${th} text-right`}>추천 광고주</th>
                <th className={`${th} text-right`}>{monthLabel(month)} 건수</th>
                <th className={`${th} text-right`}>{monthLabel(month)} 지급액</th>
                <th className={`${th} text-right`}>누적 결제</th>
                <th className={`${th} text-right`}>누적 수익</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const st = partnerStats(state, p.code, month);
                return (
                  <tr key={p.id}>
                    <td className={td}>
                      <p className="font-semibold">{p.name} {p.status === "suspended" && <Badge tone="red">정지</Badge>}</p>
                      <p className="tabular text-xs text-mute">{p.phone}</p>
                    </td>
                    <td className={td}><Badge>{p.code}</Badge></td>
                    <td className={`${td} tabular text-right`}>{st.approved}명{st.pending ? <span className="text-xs text-mute"> +대기 {st.pending}</span> : null}</td>
                    <td className={`${td} tabular text-right`}>{st.selected.count}건</td>
                    <td className={`${td} tabular text-right font-bold text-brand`}>{won(st.selected.income)}</td>
                    <td className={`${td} tabular text-right`}>{won(st.total.amount)}</td>
                    <td className={`${td} tabular text-right font-semibold`}>{won(st.total.income)}</td>
                    <td className={`${td} text-right`}>
                      {p.status === "suspended" ? (
                        <Button size="sm" variant="secondary" onClick={() => setMemberStatus("partner", p.id, "approved")}>정지 해제</Button>
                      ) : (
                        <Button size="sm" variant="danger" onClick={() => setMemberStatus("partner", p.id, "suspended")}>정지</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
