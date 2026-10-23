"use client";

import { MyPasswordCard } from "@/components/password";
import { Copy } from "lucide-react";
import { useState } from "react";
import { usePartner } from "@/components/shells";
import { Button, Card, CardHeader, cx, Empty, PageHeader, Select, Stat, Table, td, th } from "@/components/ui";
import { dateTime, won } from "@/lib/format";
import { monthKey, monthLabel, partnerStats } from "@/lib/partner";
import { useStore } from "@/lib/store";

export default function PartnerHome() {
  const p = usePartner()!;
  const { state } = useStore();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const st = partnerStats(state, p.code, month);
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/signup?ref=${p.code}` : "";
  const perDb = state.settings.incentivePerDb;
  const label = monthLabel(month);
  const isCurrent = month === monthKey(new Date());

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${p.name}님 추천 실적`}
        desc={`추천 광고주가 DB를 1건 받을 때마다 ${won(perDb)}씩 수익이 쌓입니다`}
        action={
          <div className="w-40">
            <Select className="h-10" value={month} onChange={(e) => setMonth(e.target.value)}>
            {st.months.map((m) => <option key={m.month} value={m.month}>{monthLabel(m.month)}</option>)}
          </Select>
          </div>
        }
      />

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-[13px] text-sub">내 추천인 아이디</p>
          <p className="mt-0.5 text-2xl font-bold tracking-wide">{p.code}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            navigator.clipboard?.writeText(link).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <Copy size={15} /> {copied ? "복사됨" : "가입 링크 복사"}
        </Button>
      </Card>

      <Card className="p-5">
        <p className="text-[13px] text-sub">{isCurrent ? "이번 달" : label} 내 수익</p>
        <p className="tabular mt-1 text-[32px] font-bold text-brand">{won(st.selected.income)}</p>
        <p className="tabular mt-1 text-[13px] text-mute">
          결제 {st.selected.count}건 × {won(perDb)} · 누적 수익 {won(st.total.income)}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="누적 추천 결제 금액" value={won(st.total.amount)} sub={`${st.total.count}건`} />
        <Stat label={`${isCurrent ? "이번 달" : label} 결제 금액`} value={won(st.selected.amount)} />
        <Stat label={`${isCurrent ? "이번 달" : label} 결제 건수`} value={`${st.selected.count}건`} />
        <Stat label="추천 광고주" value={`${st.approved}명`} sub={`승인 대기 ${st.pending}명 포함 시 ${st.approved + st.pending}명`} />
      </div>

      <Card>
        <CardHeader title="월별 실적" />
        <Table>
          <thead>
            <tr>
              <th className={th}>월</th>
              <th className={`${th} text-right`}>결제 건수</th>
              <th className={`${th} text-right`}>결제 금액</th>
              <th className={`${th} text-right`}>내 수익</th>
            </tr>
          </thead>
          <tbody>
            {st.months.map((m) => (
              <tr key={m.month} onClick={() => setMonth(m.month)} className={cx("cursor-pointer hover:bg-page", m.month === month && "bg-brand-soft/50")}>
                <td className={`${td} font-semibold`}>{monthLabel(m.month)}</td>
                <td className={`${td} tabular text-right`}>{m.count}건</td>
                <td className={`${td} tabular text-right`}>{won(m.amount)}</td>
                <td className={`${td} tabular text-right font-bold text-brand`}>{won(m.income)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title={`${label} 결제 내역`} />
        {st.inMonth.length === 0 ? (
          <Empty title="이 달의 결제 내역이 없습니다" />
        ) : (
          <ul className="divide-y divide-line">
            {st.inMonth.map((a) => {
              const adv = state.advertisers.find((x) => x.id === a.advertiserId)!;
              return (
                <li key={a.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold">{adv.name}{adv.company ? ` · ${adv.company}` : ""}</p>
                    <p className="text-xs text-mute">{dateTime(a.assignedAt)} · DB 1건 {won(a.amount)}</p>
                  </div>
                  <span className="tabular font-semibold text-brand">+{won(perDb)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <MyPasswordCard />
    </div>
  );
}
