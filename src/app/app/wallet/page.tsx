"use client";

import { useState } from "react";
import { useAdvertiser } from "@/components/shells";
import { Badge, Button, Card, CardHeader, cx, Empty, Field, Input, Notice, PageHeader } from "@/components/ui";
import { balanceOf } from "@/lib/engine";
import { dateTime, won } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { WalletType } from "@/lib/types";

const typeLabel: Record<WalletType, string> = { charge: "충전", debit: "차감", refund: "불량 환원", adjust: "조정" };

export default function WalletPage() {
  const adv = useAdvertiser()!;
  const { state, requestDeposit } = useStore();
  const { minCharge, price } = state.settings;
  const presets = [minCharge, minCharge * 2, minCharge * 3];
  const [amount, setAmount] = useState(minCharge);
  const [depositor, setDepositor] = useState(adv.name);
  const [agree, setAgree] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const balance = balanceOf(state, adv.id);
  const txs = state.wallet.filter((t) => t.advertiserId === adv.id);
  const requests = state.deposits.filter((d) => d.advertiserId === adv.id);

  const submit = () => {
    if (!agree) return setMsg({ ok: false, text: "환불 불가 안내에 동의해 주세요." });
    const err = requestDeposit(adv.id, amount, depositor);
    if (err) return setMsg({ ok: false, text: err });
    setMsg({ ok: true, text: "충전 신청이 접수됐습니다. 입금이 확인되면 예치금에 반영됩니다." });
    setAgree(false);
  };

  return (
    <div>
      <PageHeader title="예치금" desc={`DB 1건당 ${won(price)}(VAT 포함)이 차감됩니다`} />
      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[13px] text-sub">현재 예치금</p>
            <p className="tabular mt-1 text-[28px] font-bold">{won(balance)}</p>
            <p className="mt-1 text-[13px] text-mute">약 {Math.floor(balance / price)}건 받을 수 있습니다</p>
          </Card>

          <Card>
            <CardHeader title="충전 신청" desc={`최소 ${won(minCharge)}부터 · 계좌이체만 가능`} />
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-3 gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    className={cx(
                      "h-11 rounded-lg border text-sm font-semibold",
                      amount === p ? "border-brand bg-brand-soft text-brand" : "border-line text-sub hover:bg-page",
                    )}
                  >
                    {(p / 10000).toLocaleString()}만원
                  </button>
                ))}
              </div>
              <Field label="충전 금액" hint={`${Math.floor(amount / price)}건분`}>
                <Input
                  inputMode="numeric"
                  value={amount.toLocaleString()}
                  onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)}
                />
              </Field>
              <Field label="입금자명"><Input value={depositor} onChange={(e) => setDepositor(e.target.value)} /></Field>
              <div className="rounded-lg bg-page px-4 py-3 text-sm">
                <p className="text-[13px] text-sub">입금 계좌</p>
                <p className="tabular mt-0.5 font-semibold">{state.settings.bankAccount.bank} {state.settings.bankAccount.number} · {state.settings.bankAccount.holder}</p>
              </div>
              <label className="flex items-start gap-2 text-[13px] leading-relaxed text-sub">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#2659d9]" />
                충전한 예치금은 환불되지 않으며, 불량 승인 건만 예치금으로 환원되는 것에 동의합니다.
              </label>
              {msg && <p className={cx("text-[13px]", msg.ok ? "text-brand" : "text-bad")}>{msg.text}</p>}
              <Button size="lg" className="w-full" onClick={submit}>{won(amount)} 충전 신청</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {requests.some((r) => r.status === "pending") && (
            <Notice tone="blue">
              입금 확인 중인 신청이 있습니다:{" "}
              {requests.filter((r) => r.status === "pending").map((r) => won(r.amount)).join(", ")}
            </Notice>
          )}
          <Card>
            <CardHeader title="예치금 내역" />
            {txs.length === 0 ? (
              <Empty title="아직 내역이 없습니다" />
            ) : (
              <ul className="divide-y divide-line">
                {txs.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={t.amount > 0 ? "blue" : "gray"}>{typeLabel[t.type]}</Badge>
                        <span className="truncate text-sm">{t.note}</span>
                      </div>
                      <p className="mt-1 text-xs text-mute">{dateTime(t.at)}</p>
                    </div>
                    <span className={cx("tabular shrink-0 text-[15px] font-semibold", t.amount > 0 ? "text-brand" : "text-ink")}>
                      {t.amount > 0 ? "+" : ""}{won(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
