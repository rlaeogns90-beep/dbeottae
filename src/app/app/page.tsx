"use client";

import Link from "next/link";
import { useState } from "react";
import { LeadRow } from "@/components/lead-parts";
import { LiveFeed } from "@/components/live-feed";
import { useAdvertiser } from "@/components/shells";
import { Button, Card, CardHeader, Empty, Modal, Notice, Toggle } from "@/components/ui";
import { balanceOf, reopenAt, todayCount } from "@/lib/engine";
import { remaining, won } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function AdvertiserHome() {
  const adv = useAdvertiser()!;
  const { state, now, setReceiving } = useStore();
  const [confirmOff, setConfirmOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = balanceOf(state, adv.id);
  const left = Math.floor(balance / state.settings.price);
  const today = todayCount(state, adv.id, now);
  const lockUntil = reopenAt(state, adv);
  const lockLeft = lockUntil ? remaining(lockUntil, now) : null;
  const mine = state.assignments.filter((a) => a.advertiserId === adv.id);
  const pendingDeposit = state.deposits.find((d) => d.advertiserId === adv.id && d.status === "pending");

  const toggle = (on: boolean) => {
    setError(null);
    if (!on) return setConfirmOff(true);
    const err = setReceiving(adv.id, true);
    if (err) setError(err);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-sub">DB 수신</p>
            <p className={adv.receiving ? "mt-1 text-2xl font-bold text-brand" : "mt-1 text-2xl font-bold text-mute"}>
              {adv.receiving ? "받는 중" : "꺼짐"}
            </p>
          </div>
          <Toggle on={adv.receiving} onChange={toggle} disabled={!adv.receiving && !!lockLeft} />
        </div>
        <div className="mt-4 space-y-2">
          {!adv.receiving && adv.offBy === "auto" && (
            <Notice tone="orange">
              예치금을 모두 사용해서 수신이 자동으로 꺼졌습니다. 충전이 승인되면 다시 켤 수 있습니다.
              {pendingDeposit && " (충전 확인 중)"}
            </Notice>
          )}
          {!adv.receiving && lockLeft && (
            <Notice>직접 끈 뒤 24시간이 지나야 다시 켤 수 있습니다. <b className="tabular">{lockLeft}</b> 남았습니다.</Notice>
          )}
          {adv.receiving && <p className="text-[13px] text-mute">평일에는 시간과 상관없이 DB가 들어오는 즉시 알림톡으로 보내드립니다.</p>}
          {error && <p className="text-[13px] text-bad">{error}</p>}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5">
          <p className="text-[13px] text-sub">예치금</p>
          <p className="tabular mt-1 text-xl font-bold">{won(balance)}</p>
          <p className="mt-1 text-xs text-mute">약 {left}건 받을 수 있음</p>
          <Link href="/app/wallet"><Button variant="secondary" size="sm" className="mt-3 w-full">충전하기</Button></Link>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] text-sub">오늘 받은 DB</p>
          <p className="tabular mt-1 text-xl font-bold">
            {today}<span className="text-base font-semibold text-mute"> / {state.settings.dailyLimit}건</span>
          </p>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: state.settings.dailyLimit }, (_, i) => (
              <span key={i} className={i < today ? "h-1.5 flex-1 rounded-full bg-brand" : "h-1.5 flex-1 rounded-full bg-soft"} />
            ))}
          </div>
          <p className="mt-2 text-xs text-mute">하루 최대 {state.settings.dailyLimit}건</p>
        </Card>
      </div>

      <LiveFeed />

      <Card>
        <CardHeader
          title="최근 받은 DB"
          action={<Link href="/app/leads" className="text-[13px] font-semibold text-brand">전체 보기</Link>}
        />
        {mine.length === 0 ? (
          <Empty title="아직 받은 DB가 없습니다" desc="수신을 켜 두면 DB가 들어오는 즉시 여기에 표시됩니다." />
        ) : (
          <div className="divide-y divide-line">
            {mine.slice(0, 5).map((a) => <LeadRow key={a.id} a={a} />)}
          </div>
        )}
      </Card>

      <Modal
        open={confirmOff}
        title="DB 수신을 끌까요?"
        onClose={() => setConfirmOff(false)}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmOff(false)}>취소</Button>
            <Button
              className="flex-1"
              onClick={() => {
                setReceiving(adv.id, false);
                setConfirmOff(false);
              }}
            >
              끄기
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-sub">
          끄면 <b className="text-ink">24시간 동안 다시 켤 수 없습니다.</b> 특정 시간대에만 받는 방식은 지원하지 않습니다.
        </p>
      </Modal>
    </div>
  );
}
