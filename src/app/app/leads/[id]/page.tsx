"use client";

import { ChevronLeft, Phone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { carLine, CONSULTS, consultTone, useDefectState } from "@/components/lead-parts";
import { useAdvertiser } from "@/components/shells";
import { Badge, Button, Card, cx, Empty, Field, Modal, Notice, Textarea } from "@/components/ui";
import { dateTime, won } from "@/lib/format";
import { memoLog } from "@/lib/memo";
import { useStore } from "@/lib/store";

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const adv = useAdvertiser()!;
  const { state, updateAssignment, addMemo, reportDefect } = useStore();
  const a = state.assignments.find((x) => x.id === id && x.advertiserId === adv.id);
  const [memo, setMemo] = useState("");
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const defect = useDefectState(a);

  if (!a) return <Card><Empty title="DB를 찾을 수 없습니다" /></Card>;
  const lead = state.leads.find((l) => l.id === a.leadId)!;
  const { report } = defect;

  const rows: [string, React.ReactNode][] = [
    ["연락처", <span key="p" className="tabular">{lead.phone}</span>],
    ["차종", lead.car || "-"],
    ...(lead.months ? ([["개월수", `${lead.months}개월`]] as [string, React.ReactNode][]) : []),
    ...(lead.memo ? ([["고객 메모", lead.memo]] as [string, React.ReactNode][]) : []),
    ["수신 시각", dateTime(a.assignedAt)],
    ["브랜드명", lead.pageName || "-"],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/app/leads" className="mb-2 inline-flex items-center gap-0.5 py-2 text-sm text-sub hover:text-ink">
        <ChevronLeft size={18} /> DB 관리
      </Link>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold">{lead.name}</h1>
            <p className="mt-0.5 text-sm text-sub">{carLine(lead)}</p>
          </div>
          <Badge tone={consultTone[a.consult]}>{a.consult}</Badge>
        </div>
        <a href={`tel:${lead.phone.replace(/-/g, "")}`} className="mt-5 block">
          <Button size="lg" className="w-full"><Phone size={18} /> 전화 걸기</Button>
        </a>
        <dl className="mt-5 divide-y divide-line border-t border-line">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between py-3 text-sm">
              <dt className="text-sub">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="mt-4 p-5">
        <p className="mb-2 text-[13px] font-semibold text-sub">상담 상태</p>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {CONSULTS.map((c) => (
            <button
              key={c}
              onClick={() => updateAssignment(a.id, { consult: c })}
              className={cx(
                "h-10 rounded-lg border text-sm font-semibold",
                a.consult === c ? "border-brand bg-brand-soft text-brand" : "border-line text-sub hover:bg-page",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <Field label="상담 메모">
            <Textarea id="consult-memo" rows={3} maxLength={2000} value={memo} onChange={(e) => { setMemo(e.target.value); setSavedAt(null); }} placeholder="통화 내용, 다음 연락 시간 등" />
          </Field>
          <div className="mt-2 flex items-center justify-end gap-3">
            {savedAt && <span className="text-[13px] text-brand">{savedAt} 저장됨</span>}
            {!savedAt && memo.trim() && <span className="text-[13px] text-mute">저장하지 않은 메모가 있습니다</span>}
            <Button
              size="sm"
              disabled={!memo.trim()}
              onClick={() => {
                addMemo(a.id, memo);
                setMemo("");
                setSavedAt(dateTime(new Date().toISOString()).split(" ")[1]);
              }}
            >
              메모 저장
            </Button>
          </div>
          {/* 저장한 메모는 아래에 최신순으로 쌓인다 */}
          {memoLog(a).length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-[13px] font-semibold text-sub">메모 기록 {memoLog(a).length}</p>
              <ul className="space-y-2">
                {memoLog(a).map((m, i) => (
                  <li key={`${m.at ?? "old"}-${i}`} className="rounded-lg bg-page px-3.5 py-2.5">
                    <p className="tabular text-xs text-mute">{m.at ? dateTime(m.at) : "이전 메모"}</p>
                    <p className="mt-0.5 text-sm leading-relaxed break-words whitespace-pre-wrap">{m.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold">불량 처리</p>
            <p className="mt-0.5 text-[13px] text-sub">결번이면 받은 시점과 상관없이 언제든 신청할 수 있습니다.</p>
          </div>
          {!report || report.status === "rejected" ? (
            <Button variant="danger" size="sm" onClick={() => setOpen(true)}>불량 처리</Button>
          ) : null}
        </div>
        <div className="mt-3">
          {report?.status === "pending" && <Notice tone="orange">지원팀이 결번인지 확인하고 있습니다. 확인되면 {won(a.amount)} 전액이 예치금으로 환급됩니다.</Notice>}
          {report?.status === "approved" && <Notice tone="blue">결번이 확인되어 {won(a.amount)} 전액(100%)이 예치금으로 환급됐습니다.</Notice>}
          {report?.status === "rejected" && <Notice>반려됨: {report.rejectReason ?? "사유 없음"}</Notice>}
          {!report && <p className="text-[13px] text-mute">결번이 확인되면 DB 금액 100%를 예치금으로 돌려드립니다.</p>}
        </div>
      </Card>

      <Modal
        open={open}
        title="불량 처리 신청"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>취소</Button>
            <Button
              className="flex-1"
              onClick={() => {
                const err = reportDefect(a.id, "결번", fileName);
                if (err) return setError(err);
                setOpen(false);
              }}
            >
              신청하기
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-page px-4 py-3 text-sm">
            <span className="text-sub">사유</span>
            <span className="font-semibold">결번</span>
          </div>
          <Field label="통화 녹음 파일 (선택)" hint="결번은 녹음 없이도 신청할 수 있습니다. 있으면 첨부하면 검토가 빨라집니다.">
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              className="block w-full text-sm text-sub file:mr-3 file:h-10 file:rounded-lg file:border file:border-line file:bg-white file:px-4 file:text-sm file:font-semibold file:text-ink"
            />
          </Field>
          <Notice>불량은 결번만 인정되며 신청 기한은 없습니다. 지원팀이 번호를 확인하면 {won(a.amount)} 전액이 예치금으로 환급됩니다.</Notice>
          {error && <p className="text-[13px] text-bad">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
