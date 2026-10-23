"use client";

import { FileAudio } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, CardHeader, Empty, Field, Modal, PageHeader, Table, Textarea, td, th } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function AdminDefectsPage() {
  const { state, handleDefect } = useStore();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const pending = state.defects.filter((d) => d.status === "pending");
  const done = state.defects.filter((d) => d.status !== "pending");

  const info = (assignmentId: string) => {
    const a = state.assignments.find((x) => x.id === assignmentId)!;
    return { a, lead: state.leads.find((l) => l.id === a.leadId)!, adv: state.advertisers.find((x) => x.id === a.advertiserId)! };
  };

  return (
    <div className="space-y-6">
      <PageHeader title="불량 처리 승인" desc="결번만 인정합니다. 번호가 결번인지 확인하고 승인하면 44,000원이 광고주 예치금으로 환원됩니다" />

      {pending.length === 0 ? (
        <Card><Empty title="검토할 불량 신청이 없습니다" /></Card>
      ) : (
        <div className="space-y-3">
          {pending.map((d) => {
            const { a, lead, adv } = info(d.assignmentId);
            return (
              <Card key={d.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="red">{d.reason}</Badge>
                      <span className="text-[15px] font-bold">{lead.name}</span>
                      <span className="tabular text-sm text-sub">{lead.phone}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-sub">
                      광고주 {adv.name} · 배정 {dateTime(a.assignedAt)} · 신청 {dateTime(d.at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => { setRejecting(d.id); setReason(""); }}>반려</Button>
                    <Button size="sm" onClick={() => handleDefect(d.id, true)}>승인 · 44,000원 환원</Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-lg bg-page px-4 py-3">
                  <FileAudio size={20} className="text-sub" />
                  <span className="flex-1 truncate text-sm">{d.fileName ?? "통화 녹음 없음 · 번호 상태로 결번 여부 확인"}</span>
                  {d.fileName && <Button variant="secondary" size="sm">녹음 듣기</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader title="처리 내역" />
        {done.length === 0 ? (
          <Empty title="처리 내역이 없습니다" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>처리 시각</th>
                <th className={th}>광고주</th>
                <th className={th}>고객</th>
                <th className={th}>사유</th>
                <th className={th}>결과</th>
              </tr>
            </thead>
            <tbody>
              {done.map((d) => {
                const { lead, adv } = info(d.assignmentId);
                return (
                  <tr key={d.id}>
                    <td className={`${td} tabular`}>{dateTime(d.handledAt ?? d.at)}</td>
                    <td className={td}>{adv.name}</td>
                    <td className={td}>{lead.name}</td>
                    <td className={td}>{d.reason}</td>
                    <td className={td}>
                      {d.status === "approved" ? <Badge tone="blue">승인 · 환원</Badge> : <><Badge tone="red">반려</Badge> <span className="text-xs text-mute">{d.rejectReason}</span></>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={!!rejecting}
        title="불량 신청 반려"
        onClose={() => setRejecting(null)}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setRejecting(null)}>취소</Button>
            <Button className="flex-1" disabled={!reason.trim()} onClick={() => { handleDefect(rejecting!, false, reason.trim()); setRejecting(null); }}>반려하기</Button>
          </>
        }
      >
        <Field label="반려 사유" required hint="광고주에게 그대로 보여집니다.">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 녹음상 고객 본인과 통화가 확인됨" />
        </Field>
      </Modal>
    </div>
  );
}
