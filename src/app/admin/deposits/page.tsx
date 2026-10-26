"use client";

import { ReceiptFileCell, ReceiptStatusToggle } from "@/components/receipt";
import { Badge, Button, Card, CardHeader, Empty, PageHeader, Table, td, th } from "@/components/ui";
import { dateTime, won } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function DepositsPage() {
  const { state, handleDeposit } = useStore();
  const pending = state.deposits.filter((d) => d.status === "pending");
  const done = state.deposits.filter((d) => d.status !== "pending");
  const adv = (id: string) => state.advertisers.find((a) => a.id === id)!;

  return (
    <div className="space-y-6">
      <PageHeader title="입금 확인" desc="통장 입금을 확인한 뒤 승인하면 예치금에 바로 반영됩니다" />
      <Card>
        <CardHeader title={`확인 대기 ${pending.length}건`} />
        {pending.length === 0 ? (
          <Empty title="확인할 입금이 없습니다" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>신청 시각</th>
                <th className={th}>광고주</th>
                <th className={th}>입금자명</th>
                <th className={th}>증빙</th>
                <th className={`${th} text-right`}>금액</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {pending.map((d) => {
                const a = adv(d.advertiserId);
                return (
                  <tr key={d.id}>
                    <td className={`${td} tabular`}>{dateTime(d.at)}</td>
                    <td className={td}><p className="font-semibold">{a.name}</p><p className="text-xs text-mute">{a.company ?? a.loginId}</p></td>
                    <td className={td}>{d.depositor}</td>
                    <td className={td}>{a.receiptType === "tax" ? "세금계산서" : "현금영수증"}</td>
                    <td className={`${td} tabular text-right font-bold`}>{won(d.amount)}</td>
                    <td className={`${td} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        <Button variant="danger" size="sm" onClick={() => handleDeposit(d.id, false)}>반려</Button>
                        <Button size="sm" onClick={() => handleDeposit(d.id, true)}>입금 확인</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="처리 내역" desc="입금이 확인된 건은 증빙(세금계산서·현금영수증)을 발행한 뒤 '발행완료'로 바꾸고, 발행 파일을 첨부하면 광고주 화면에도 보입니다" />
        {done.length === 0 ? (
          <Empty title="처리 내역이 없습니다" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>처리 시각</th>
                <th className={th}>광고주</th>
                <th className={th}>입금자명</th>
                <th className={th}>증빙</th>
                <th className={`${th} text-right`}>금액</th>
                <th className={th}>결과</th>
                <th className={th}>발행 파일</th>
              </tr>
            </thead>
            <tbody>
              {done.map((d) => (
                <tr key={d.id}>
                  <td className={`${td} tabular whitespace-nowrap`}>{dateTime(d.handledAt ?? d.at)}</td>
                  <td className={`${td} whitespace-nowrap`}>{adv(d.advertiserId).name}</td>
                  <td className={`${td} whitespace-nowrap`}>{d.depositor}</td>
                  <td className={`${td} whitespace-nowrap`}>{adv(d.advertiserId).receiptType === "tax" ? "세금계산서" : "현금영수증"}</td>
                  <td className={`${td} tabular whitespace-nowrap text-right`}>{won(d.amount)}</td>
                  <td className={td}>{d.status === "approved" ? <ReceiptStatusToggle d={d} /> : <Badge tone="red">반려</Badge>}</td>
                  <td className={td}>{d.status === "approved" ? <ReceiptFileCell d={d} /> : <span className="text-mute">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
