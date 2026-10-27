"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ResetPasswordButton } from "@/components/password";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Table, Toggle, td, th } from "@/components/ui";
import { industryOptions } from "@/lib/content";
import { balanceOf, groupNo, groupOf, todayCount } from "@/lib/engine";
import { won } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Advertiser } from "@/lib/types";

function EditModal({ adv, onClose }: { adv: Advertiser; onClose: () => void }) {
  const { state, updateAdvertiser, setMemberStatus, adjustWallet } = useStore();
  const [f, setF] = useState({ name: adv.name, phone: adv.phone, company: adv.company ?? "", industry: adv.industry ?? "", referrer: adv.referrer, email: adv.tax?.email ?? "" });
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  return (
    <Modal
      open
      title={`${adv.name} 광고주`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onClose}>닫기</Button>
          <Button
            className="flex-1"
            onClick={() => {
              updateAdvertiser(adv.id, {
                name: f.name, phone: f.phone, company: f.company || undefined, industry: f.industry || undefined, referrer: f.referrer.toUpperCase(),
                tax: adv.tax ? { ...adv.tax, email: f.email } : undefined,
              });
              onClose();
            }}
          >
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <p className="text-[13px] font-bold">기본 정보 (광고주는 직접 수정할 수 없음)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="이름"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="DB 수신 번호"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="회사명"><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
            <Field label="추천인"><Input value={f.referrer} onChange={(e) => setF({ ...f, referrer: e.target.value })} /></Field>
            <Field label="업종">
              <Select value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })}>
                {!f.industry && <option value="">선택 안 함</option>}
                {industryOptions.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
              </Select>
            </Field>
          </div>
          {adv.tax && <Field label="계산서 이메일"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>}
        </section>

        <section className="flex items-center justify-between rounded-lg bg-page px-4 py-3 text-sm">
          <span className="text-sub">배정 순번</span>
          <span className="font-semibold">
            {groupOf(state, adv.id) ? `${groupNo(state, groupOf(state, adv.id)!.id)}번 그룹` : "그룹 없음 · 자동 배정 안 됨"}
            <Link href="/admin/groups" className="ml-2 text-[13px] font-semibold text-brand">변경</Link>
          </span>
        </section>

        <section className="space-y-3">
          <p className="text-[13px] font-bold">예치금 수동 조정 · 현재 {won(balanceOf(state, adv.id))}</p>
          <div className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
            <Input placeholder="+44000 / -44000" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))} />
            <Input placeholder="사유 (필수)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button
              variant="secondary"
              disabled={!Number(amount) || !note.trim()}
              onClick={() => { adjustWallet(adv.id, Number(amount), note.trim()); setAmount(""); setNote(""); }}
            >
              반영
            </Button>
          </div>
        </section>

        <section className="flex items-center justify-between rounded-lg bg-page px-4 py-3">
          <div>
            <p className="text-sm font-semibold">계정 상태</p>
            <p className="text-xs text-mute">정지하면 로그인과 DB 배정이 모두 멈춥니다</p>
          </div>
          {adv.status === "suspended" ? (
            <Button size="sm" onClick={() => setMemberStatus("advertiser", adv.id, "approved")}>정지 해제</Button>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setMemberStatus("advertiser", adv.id, "suspended")}>이용 정지</Button>
          )}
        </section>

        <section className="flex items-center justify-between rounded-lg bg-page px-4 py-3 text-sm">
          <span className="text-sub">로그인 비밀번호 (아이디 {adv.loginId})</span>
          <ResetPasswordButton kind="advertiser" id={adv.id} name={adv.name} />
        </section>
      </div>
    </Modal>
  );
}

export default function AdminAdvertisers() {
  const { state, now, updateAdvertiser } = useStore();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const list = state.advertisers
    .filter((a) => a.status === "approved" || a.status === "suspended")
    .filter((a) => !q || [a.name, a.company, a.industry, a.phone, a.referrer, a.loginId].some((v) => v?.includes(q)));
  const editingAdv = state.advertisers.find((a) => a.id === editing);

  return (
    <div>
      <PageHeader title="광고주" desc={`승인된 광고주 ${list.length}명`} />
      <div className="relative mb-3 max-w-sm">
        <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
        <Input className="pl-9" placeholder="이름, 회사, 연락처, 추천인 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card>
        {list.length === 0 ? (
          <Empty title="광고주가 없습니다" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>광고주</th>
                <th className={th}>DB 수신 번호</th>
                <th className={th}>추천인</th>
                <th className={th}>순번</th>
                <th className={th}>수신</th>
                <th className={`${th} text-right`}>오늘</th>
                <th className={`${th} text-right`}>예치금</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className={td}>
                    <p className="font-semibold">{a.name} {a.status === "suspended" && <Badge tone="red">정지</Badge>}</p>
                    <p className="text-xs text-mute">{a.company ?? a.loginId}{a.industry ? ` · ${a.industry}` : ""}</p>
                  </td>
                  <td className={`${td} tabular`}>{a.phone}</td>
                  <td className={td}>{a.referrer}</td>
                  <td className={`${td} tabular text-[13px] text-sub`}>{groupOf(state, a.id) ? `${groupNo(state, groupOf(state, a.id)!.id)}번` : "-"}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <Toggle on={a.receiving} onChange={(on) => updateAdvertiser(a.id, on ? { receiving: true, offAt: undefined, offBy: undefined } : { receiving: false, offAt: new Date().toISOString(), offBy: "admin" })} disabled={a.status !== "approved"} />
                      {!a.receiving && a.offBy && <span className="text-xs text-mute">{a.offBy === "auto" ? "잔액 소진" : a.offBy === "self" ? "직접 OFF" : "관리자"}</span>}
                    </div>
                  </td>
                  <td className={`${td} tabular text-right`}>{todayCount(state, a.id, now)}/{state.settings.dailyLimit}</td>
                  <td className={`${td} tabular text-right font-semibold`}>{won(balanceOf(state, a.id))}</td>
                  <td className={`${td} text-right`}><Button variant="secondary" size="sm" onClick={() => setEditing(a.id)}>관리</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {editingAdv && <EditModal adv={editingAdv} onClose={() => setEditing(null)} />}
    </div>
  );
}
