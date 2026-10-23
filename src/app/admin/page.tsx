"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, cx, Empty, Field, Input, Modal, Notice, PageHeader, Select, Stat, Table, td, th } from "@/components/ui";
import { dateTime, formatPhone, timeAgo, won } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { LeadStatus } from "@/lib/types";

const tabs: { key: "all" | LeadStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "assigned", label: "배정 완료" },
  { key: "waiting", label: "관리자 대기" },
  { key: "defect", label: "불량" },
];

const sameDay = (iso: string, now: Date) => new Date(iso).toDateString() === now.toDateString();

export default function RealtimePage() {
  const { state, now, simulateLead } = useStore();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", car: "", months: "48", groupId: "" });

  const today = state.leads.filter((l) => sameDay(l.createdAt, now));
  const todaySales = state.assignments.filter((a) => sameDay(a.assignedAt, now)).reduce((n, a) => n + a.amount, 0);
  const list = [...state.leads]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((l) => tab === "all" || l.status === tab);

  return (
    <div>
      <PageHeader
        title="실시간 DB 현황"
        desc="들어온 모든 DB와 배정 결과가 실시간으로 표시됩니다"
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> 테스트 DB 접수</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="오늘 접수" value={`${today.length}건`} />
        <Stat label="오늘 배정" value={`${today.filter((l) => l.status === "assigned").length}건`} />
        <Stat label="관리자 대기" value={`${state.leads.filter((l) => l.status === "waiting").length}건`} tone={state.leads.some((l) => l.status === "waiting") ? "bad" : undefined} />
        <Stat label="수신 ON 광고주" value={`${state.advertisers.filter((a) => a.receiving).length}명`} />
        <Stat label="오늘 매출 (VAT 포함)" value={won(todaySales)} />
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cx("h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold", tab === t.key ? "bg-ink text-white" : "border border-line bg-white text-sub")}
          >
            {t.label} {t.key === "all" ? state.leads.length : state.leads.filter((l) => l.status === t.key).length}
          </button>
        ))}
      </div>

      <Card>
        {list.length === 0 ? (
          <Empty title="해당하는 DB가 없습니다" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>접수</th>
                <th className={th}>고객</th>
                <th className={th}>차종 · 개월수</th>
                <th className={th}>유입 (매체 · 브랜드)</th>
                <th className={th}>배정 광고주</th>
                <th className={th}>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => {
                const a = state.assignments.find((x) => x.leadId === l.id);
                const adv = a && state.advertisers.find((x) => x.id === a.advertiserId);
                const fresh = now.getTime() - new Date(l.createdAt).getTime() < 90_000;
                return (
                  <tr key={l.id} className={fresh ? "bg-brand-soft/60" : undefined}>
                    <td className={`${td} tabular whitespace-nowrap`}>
                      {dateTime(l.createdAt)}
                      <p className="text-xs text-mute">{timeAgo(l.createdAt, now)}</p>
                    </td>
                    <td className={td}>
                      <p className="font-semibold">{l.name}</p>
                      <p className="tabular text-xs text-sub">{l.phone}</p>
                    </td>
                    <td className={td}>{l.car} · {l.months}개월</td>
                    <td className={`${td} text-[13px] text-sub`}>{l.site} · <span className="font-semibold text-ink">{l.brand}</span></td>
                    <td className={td}>
                      {adv ? (
                        <>
                          <p className="font-medium">{adv.name}</p>
                          <p className="text-xs text-mute">{dateTime(a!.assignedAt)} · {a!.method === "auto" ? "자동" : a!.method === "admin" ? "관리자" : "외부 어드민"}</p>
                        </>
                      ) : (
                        <span className="text-mute">-</span>
                      )}
                    </td>
                    <td className={td}>
                      {l.status === "assigned" && <Badge tone="blue">배정</Badge>}
                      {l.status === "defect" && <Badge tone="red">불량</Badge>}
                      {l.status === "waiting" && (
                        <Link href="/admin/waiting" className="inline-flex flex-col items-start gap-0.5">
                          <Badge tone="orange">관리자 대기</Badge>
                          <span className="text-xs text-mute">{l.waitReason}</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={open}
        title="테스트 DB 접수"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => { simulateLead(); setOpen(false); }}>무작위로 넣기</Button>
            <Button
              className="flex-1"
              disabled={!form.name || !form.phone || !form.car}
              onClick={() => {
                simulateLead({ name: form.name, phone: form.phone, car: form.car, months: Number(form.months), groupId: form.groupId || undefined });
                setOpen(false);
                setForm({ name: "", phone: "", car: "", months: "48", groupId: "" });
              }}
            >
              접수하기
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Notice>외부 접수 페이지에서 DB가 들어온 것처럼 배정 엔진을 실행합니다. 같은 번호를 다시 넣으면 다른 광고주에게 가는지 확인할 수 있습니다.</Notice>
          <div className="grid grid-cols-2 gap-3">
            <Field label="이름" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="연락처" required><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} /></Field>
            <Field label="차종" required><Input value={form.car} onChange={(e) => setForm({ ...form, car: e.target.value })} placeholder="현대 그랜저" /></Field>
            <Field label="개월수" required>
              <Select value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })}>
                {["24", "36", "48", "60"].map((m) => <option key={m} value={m}>{m}개월</option>)}
              </Select>
            </Field>
          </div>
          <Field label="그룹 지정 (선택)">
            <Select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">전체 광고주</option>
              {state.groups.map((g, i) => <option key={g.id} value={g.id} disabled={!g.advertiserId}>{i + 1}번 그룹 · {state.advertisers.find((a) => a.id === g.advertiserId)?.name ?? "비어 있음"}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
