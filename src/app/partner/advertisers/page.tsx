"use client";

import { usePartner } from "@/components/shells";
import { Badge, Card, Empty, PageHeader, Table, td, th } from "@/components/ui";
import { fullDate, won } from "@/lib/format";
import { partnerStats } from "@/lib/partner";
import { useStore } from "@/lib/store";

export default function PartnerAdvertisers() {
  const p = usePartner()!;
  const { state } = useStore();
  const st = partnerStats(state, p.code);

  return (
    <div>
      <PageHeader title="추천 광고주" desc={`${p.code} 코드로 가입한 광고주 ${st.advertisers.length}명 (승인 ${st.approved} · 승인 대기 ${st.pending})`} />
      <Card>
        {st.advertisers.length === 0 ? (
          <Empty title="아직 추천으로 가입한 광고주가 없습니다" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>광고주</th>
                <th className={th}>가입일</th>
                <th className={th}>상태</th>
                <th className={th}>수신</th>
                <th className={`${th} text-right`}>결제 건수</th>
                <th className={`${th} text-right`}>누적 결제</th>
                <th className={`${th} text-right`}>내 수익</th>
              </tr>
            </thead>
            <tbody>
              {st.advertisers.map((a) => {
                const pays = st.paid.filter((x) => x.advertiserId === a.id);
                return (
                  <tr key={a.id}>
                    <td className={td}>
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-xs text-mute">{a.company ?? "-"}</p>
                    </td>
                    <td className={td}>{fullDate(a.createdAt)}</td>
                    <td className={td}>
                      {a.status === "approved" ? <Badge tone="green">승인</Badge> : a.status === "pending" ? <Badge tone="orange">승인 대기</Badge> : <Badge>{a.status === "rejected" ? "거절" : "정지"}</Badge>}
                    </td>
                    <td className={td}>{a.receiving ? <Badge tone="blue">ON</Badge> : <Badge>OFF</Badge>}</td>
                    <td className={`${td} tabular text-right`}>{pays.length}건</td>
                    <td className={`${td} tabular text-right`}>{won(pays.reduce((n, x) => n + x.amount, 0))}</td>
                    <td className={`${td} tabular text-right font-semibold text-brand`}>{won(pays.length * state.settings.incentivePerDb)}</td>
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
