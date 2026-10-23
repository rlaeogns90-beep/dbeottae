"use client";

import { MyPasswordCard } from "@/components/password";
import { useAdvertiser } from "@/components/shells";
import { Card, CardHeader, Notice, PageHeader } from "@/components/ui";
import { fullDate } from "@/lib/format";

export default function MePage() {
  const adv = useAdvertiser()!;
  const basic: [string, string][] = [
    ["아이디", adv.loginId],
    ["이름", adv.name],
    ["DB 수신 번호", adv.phone],
    ["회사명", adv.company ?? "-"],
    ["추천인", adv.referrer],
    ["가입일", fullDate(adv.createdAt)],
  ];
  const receipt: [string, string][] =
    adv.receiptType === "tax"
      ? [["증빙 종류", "세금계산서"], ["사업자등록증", adv.tax?.bizFileName ?? "-"], ["계산서 이메일", adv.tax?.email ?? "-"]]
      : [["증빙 종류", "현금영수증"], ["이름", adv.cash?.name ?? "-"], ["연락처", adv.cash?.phone ?? "-"], ["주민등록번호", (adv.cash?.rrn ?? "").slice(0, 8) + "******"], ["주소", adv.cash?.address ?? "-"]];

  const Section = ({ title, rows }: { title: string; rows: [string, string][] }) => (
    <Card>
      <CardHeader title={title} />
      <dl className="divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-5 py-3.5 text-sm">
            <dt className="text-sub">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="내 정보" />
      <Notice>정보 변경은 관리자만 할 수 있습니다. 1600-7628 또는 카카오톡 채널 &lsquo;마케팅을다루다&rsquo;로 요청해 주세요.</Notice>
      <Section title="기본 정보" rows={basic} />
      <Section title="증빙 정보" rows={receipt} />
      <MyPasswordCard />
    </div>
  );
}
