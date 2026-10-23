"use client";

import { usePartner } from "@/components/shells";
import { Badge, Card, Empty, Notice, PageHeader, Table, td, th } from "@/components/ui";
import { carLine, consultTone } from "@/components/lead-parts";
import { dateTime, maskName, maskPhone } from "@/lib/format";
import { partnerStats } from "@/lib/partner";
import { useStore } from "@/lib/store";

export default function PartnerLeads() {
  const p = usePartner()!;
  const { state } = useStore();
  const st = partnerStats(state, p.code);

  return (
    <div>
      <PageHeader title="배정 DB" desc="내 추천 광고주에게 배정된 DB만 볼 수 있습니다" />
      <div className="mb-4"><Notice>고객 개인정보 보호를 위해 이름과 연락처 일부를 가려서 보여드립니다.</Notice></div>
      <Card>
        {st.paid.length === 0 ? (
          <Empty title="배정된 DB가 없습니다" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>배정 시각</th>
                <th className={th}>광고주</th>
                <th className={th}>고객</th>
                <th className={th}>차종 · 개월수</th>
                <th className={th}>상담 상태</th>
              </tr>
            </thead>
            <tbody>
              {st.paid.map((a) => {
                const lead = state.leads.find((l) => l.id === a.leadId)!;
                const adv = state.advertisers.find((x) => x.id === a.advertiserId)!;
                return (
                  <tr key={a.id}>
                    <td className={`${td} tabular`}>{dateTime(a.assignedAt)}</td>
                    <td className={td}>{adv.name}</td>
                    <td className={td}>
                      {maskName(lead.name)} <span className="tabular text-sub">{maskPhone(lead.phone)}</span>
                    </td>
                    <td className={td}>{carLine(lead)}</td>
                    <td className={td}><Badge tone={consultTone[a.consult]}>{a.consult}</Badge></td>
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
