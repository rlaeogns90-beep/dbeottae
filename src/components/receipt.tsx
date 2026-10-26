"use client";

// 세금계산서·현금영수증 발행 현황 화면 조각 (관리자 처리 내역 · 광고주 예치금 화면이 같이 쓴다)
import { useRef, useState } from "react";
import { dateTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { DepositRequest } from "@/lib/types";
import { Badge, Button, cx, Modal, Notice } from "./ui";

export const receiptOf = (d: DepositRequest) => d.receipt ?? { status: "pending" as const };
const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);

/** 첨부 파일을 내려받는 링크. 로그인 쿠키가 같이 가서 본인 것만 받아진다. */
export function FileLink({ d, className }: { d: DepositRequest; className?: string }) {
  const f = d.receipt?.file;
  if (!f) return null;
  return (
    <a href={`/api/receipt-file?deposit=${encodeURIComponent(d.id)}`} className={cx("inline-flex max-w-full items-center gap-1 font-semibold text-brand hover:underline", className)}>
      <span className="truncate">{f.name}</span>
      <span className="shrink-0 text-xs font-normal text-mute">{kb(f.size)}</span>
    </a>
  );
}

/** 관리자: 대기 · 발행완료 두 칸 선택. 고른 칸에만 색이 들어온다 (대기=주황, 발행완료=초록). */
export function ReceiptStatusToggle({ d }: { d: DepositRequest }) {
  const { setReceiptStatus } = useStore();
  const r = receiptOf(d);
  const opts = [
    { issued: false, label: "대기", on: "bg-warn-soft text-warn ring-1 ring-warn/40" },
    { issued: true, label: "발행완료", on: "bg-ok-soft text-ok ring-1 ring-ok/40" },
  ];
  return (
    <div>
      <div role="group" aria-label="증빙 발행 상태" className="inline-flex rounded-lg bg-soft p-0.5">
        {opts.map((o) => {
          const active = (r.status === "issued") === o.issued;
          return (
            <button
              key={o.label}
              type="button"
              aria-pressed={active}
              onClick={() => !active && setReceiptStatus(d.id, o.issued)}
              className={cx("h-8 rounded-md px-3 text-[13px] font-bold whitespace-nowrap", active ? o.on : "text-mute hover:text-sub")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {r.status === "issued" && r.issuedAt && <p className="tabular mt-1 text-xs text-mute">{dateTime(r.issuedAt)} 발행</p>}
    </div>
  );
}

/** 관리자: 발행 파일 첨부·교체·삭제 */
export function ReceiptFileCell({ d }: { d: DepositRequest }) {
  const { attachReceiptFile, removeReceiptFile } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const f = d.receipt?.file;

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(await attachReceiptFile(d.id, file));
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="min-w-40">
      {f && <FileLink d={d} className="text-[13px]" />}
      <div className="mt-1 flex items-center gap-1.5">
        <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "올리는 중…" : f ? "다시 첨부" : "파일 첨부"}
        </Button>
        {f && !busy && (
          <button
            type="button"
            onClick={async () => setError(await removeReceiptFile(d.id))}
            className="h-9 px-2 text-xs font-semibold text-mute hover:text-bad"
          >
            삭제
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}

/** 광고주: 충전 건 옆 '계산서 확인하기' 버튼과 확인 창 */
export function ReceiptCheck({ d, kind }: { d: DepositRequest; kind: "tax" | "cash" }) {
  const [open, setOpen] = useState(false);
  const r = receiptOf(d);
  const name = kind === "tax" ? "세금계산서" : "현금영수증";
  const issued = r.status === "issued";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold whitespace-nowrap hover:bg-page"
      >
        {kind === "tax" ? "계산서 확인하기" : "현금영수증 확인하기"}
        <Badge tone={issued ? "green" : "orange"}>{issued ? "발행완료" : "대기"}</Badge>
      </button>
      <Modal open={open} title={`${name} 확인`} onClose={() => setOpen(false)} footer={<Button className="flex-1" onClick={() => setOpen(false)}>닫기</Button>}>
        <div className="space-y-4">
          <dl className="divide-y divide-line rounded-xl border border-line text-sm">
            <Row k="증빙 종류" v={name} />
            <Row k="충전 금액" v={`${d.amount.toLocaleString()}원`} />
            <Row k="입금 확인" v={d.handledAt ? dateTime(d.handledAt) : "-"} />
            <Row k="발행 상태" v={<Badge tone={issued ? "green" : "orange"}>{issued ? "발행완료" : "대기"}</Badge>} />
            {issued && <Row k="발행 시각" v={r.issuedAt ? dateTime(r.issuedAt) : "-"} />}
          </dl>
          {r.file ? (
            <a
              href={`/api/receipt-file?deposit=${encodeURIComponent(d.id)}`}
              className="flex h-12 items-center justify-between gap-3 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark"
            >
              <span className="truncate">{name} 내려받기 · {r.file.name}</span>
              <span className="shrink-0 text-xs font-medium text-white/80">{kb(r.file.size)}</span>
            </a>
          ) : issued ? (
            <Notice>발행은 완료됐고 첨부 파일은 곧 올라옵니다. 급하시면 1600-7628로 문의해 주세요.</Notice>
          ) : (
            <Notice tone="orange">아직 발행 전입니다. 입금 확인 후 영업일 기준으로 발행하며, 발행되면 이곳에서 파일을 받을 수 있습니다.</Notice>
          )}
        </div>
      </Modal>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-sub">{k}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  );
}
