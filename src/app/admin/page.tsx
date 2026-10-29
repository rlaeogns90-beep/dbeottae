"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CONSULTS, consultTone } from "@/components/lead-parts";
import { Badge, Button, Card, cx, Empty, Field, Input, Modal, Notice, PageHeader, Select, Stat, Table, td, th } from "@/components/ui";
import { dateTime, formatPhone, timeAgo, won } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ConsultStatus, LeadStatus } from "@/lib/types";

const tabs: { key: "all" | LeadStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "assigned", label: "배정 완료" },
  { key: "waiting", label: "관리자 대기" },
  { key: "defect", label: "불량" },
];

const sameDay = (iso: string, now: Date) => new Date(iso).toDateString() === now.toDateString();
const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();
const emptyForm = { name: "", phone: "", car: "", memo: "", site: "", pageName: "", term: "", groupId: "" };

export default function RealtimePage() {
  const { state, now, simulateLead, deleteLead } = useStore();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");
  const [page, setPage] = useState("");
  const [site, setSite] = useState("");
  const [consult, setConsult] = useState<"" | "none" | ConsultStatus>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [del, setDel] = useState<string | null>(null);
  const [delError, setDelError] = useState("");

  const consultOf = (leadId: string) => state.assignments.find((x) => x.leadId === leadId);
  const delLead = state.leads.find((l) => l.id === del);
  const delAsg = delLead && consultOf(delLead.id);
  const delAdv = delAsg && state.advertisers.find((x) => x.id === delAsg.advertiserId);
  const delRefund = !!delAsg && !state.defects.some((d) => d.assignmentId === delAsg.id && d.status === "approved");
  const today = state.leads.filter((l) => sameDay(l.createdAt, now));
  const todaySales = state.assignments.filter((a) => sameDay(a.assignedAt, now)).reduce((n, a) => n + a.amount, 0);
  const filtered = state.leads.filter((l) => {
    if (page && l.pageName !== page) return false;
    if (site && l.site !== site) return false;
    const c = consultOf(l.id)?.consult;
    if (consult === "none") return !c;
    return !consult || c === consult;
  });
  const list = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((l) => tab === "all" || l.status === tab);
  const filtering = page || site || consult;

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

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-sub">
          페이지명
          <Select className="w-44" value={page} onChange={(e) => setPage(e.target.value)}>
            <option value="">전체</option>
            {uniq(state.leads.map((l) => l.pageName)).map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-sub">
          매체
          <Select className="w-40" value={site} onChange={(e) => setSite(e.target.value)}>
            <option value="">전체</option>
            {uniq(state.leads.map((l) => l.site)).map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-sub">
          상담 상태
          <Select className="w-36" value={consult} onChange={(e) => setConsult(e.target.value as typeof consult)}>
            <option value="">전체</option>
            {CONSULTS.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="none">배정 전</option>
          </Select>
        </label>
        {filtering && (
          <Button variant="secondary" size="sm" className="mb-0.5" onClick={() => { setPage(""); setSite(""); setConsult(""); }}>
            필터 해제
          </Button>
        )}
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cx("h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold", tab === t.key ? "bg-ink text-white" : "border border-line bg-white text-sub")}
          >
            {t.label} {t.key === "all" ? filtered.length : filtered.filter((l) => l.status === t.key).length}
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
                <th className={th}>접수시간</th>
                <th className={th}>이름 · 연락처</th>
                <th className={th}>차종 · 메모</th>
                <th className={th}>페이지명 · 매체</th>
                <th className={th}>광고소재명</th>
                <th className={th}>배정 광고주</th>
                <th className={th}>배정 상태</th>
                <th className={th}>상담 상태</th>
                <th className={th}><span className="sr-only">삭제</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => {
                const a = consultOf(l.id);
                const adv = a && state.advertisers.find((x) => x.id === a.advertiserId);
                const fresh = now.getTime() - new Date(l.createdAt).getTime() < 90_000;
                return (
                  <tr key={l.id} className={fresh ? "bg-brand-soft/60" : undefined}>
                    <td className={`${td} tabular whitespace-nowrap`}>
                      {dateTime(l.createdAt)}
                      <p className="text-xs text-mute">{timeAgo(l.createdAt, now)}</p>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <p className="font-semibold">{l.name}</p>
                      <p className="tabular text-xs text-sub">{l.phone}</p>
                    </td>
                    <td className={td}>
                      <p className="whitespace-nowrap">{l.car || "-"}</p>
                      {l.memo && <p className="min-w-32 max-w-56 text-xs text-sub">{l.memo}</p>}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <p>{l.pageName || "-"}</p>
                      <p className="text-xs text-sub">{l.site || "-"}</p>
                    </td>
                    <td className={`${td} whitespace-nowrap text-[13px]`}>{l.term || "-"}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {adv ? (
                        <>
                          <p className="font-medium">{adv.name}</p>
                          <p className="text-xs text-mute">{dateTime(a!.assignedAt)} · {a!.method === "auto" ? "자동" : a!.method === "admin" ? "관리자" : "외부 어드민"}</p>
                        </>
                      ) : (
                        <span className="text-mute">-</span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {l.status === "assigned" && <Badge tone="blue">배정</Badge>}
                      {l.status === "defect" && <Badge tone="red">불량</Badge>}
                      {l.status === "waiting" && (
                        <Link href="/admin/waiting" className="inline-flex flex-col items-start gap-0.5">
                          <Badge tone="orange">관리자 대기</Badge>
                          <span className="text-xs text-mute">{l.waitReason}</span>
                        </Link>
                      )}
                    </td>
                    <td className={td}>{a ? <Badge tone={consultTone[a.consult]}>{a.consult}</Badge> : <span className="text-mute">-</span>}</td>
                    <td className={td}>
                      <button
                        type="button"
                        aria-label={`${l.name} DB 삭제`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-mute hover:bg-bg hover:text-bad"
                        onClick={() => { setDelError(""); setDel(l.id); }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={!!delLead}
        title="DB 삭제"
        onClose={() => setDel(null)}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setDel(null)}>취소</Button>
            <Button
              className="flex-1"
              onClick={() => {
                const err = deleteLead(del!);
                if (err) setDelError(err);
                else setDel(null);
              }}
            >
              삭제하기
            </Button>
          </>
        }
      >
        {delLead && (
          <div className="space-y-3 text-sm">
            <p><b>{delLead.name}</b> · {delLead.phone} · {delLead.car || "-"}</p>
            <Notice>
              삭제하면 목록에서 사라지고 되돌릴 수 없습니다.
              {delAsg && delAdv && (delRefund ? ` 배정받은 ${delAdv.name} 광고주 화면에서도 사라지고, 차감된 ${won(delAsg.amount)}이 예치금으로 환급됩니다.` : ` ${delAdv.name} 광고주 화면에서도 사라집니다. 결번 환급은 이미 처리되어 다시 환급하지 않습니다.`)}
              {" "}구글 시트에 쌓인 기록은 지워지지 않으니 시트에서 직접 지워 주세요.
            </Notice>
            {delError && <p className="text-bad">{delError}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={open}
        title="테스트 DB 접수"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => { simulateLead(); setOpen(false); }}>무작위로 넣기</Button>
            <Button
              className="flex-1"
              disabled={!form.name || !form.phone}
              onClick={() => {
                simulateLead({
                  name: form.name,
                  phone: form.phone,
                  car: form.car,
                  brand: form.car.split(" ")[0] || undefined,
                  memo: form.memo || undefined,
                  site: form.site || "테스트",
                  pageName: form.pageName || undefined,
                  term: form.term || undefined,
                  groupId: form.groupId || undefined,
                });
                setOpen(false);
                setForm(emptyForm);
              }}
            >
              접수하기
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Notice>웹훅으로 DB가 들어온 것처럼 배정 엔진을 실행합니다. 같은 번호를 다시 넣으면 다른 광고주에게 가는지 확인할 수 있습니다.</Notice>
          <div className="grid grid-cols-2 gap-3">
            <Field label="이름" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="연락처" required><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} /></Field>
            <Field label="차종"><Input value={form.car} onChange={(e) => setForm({ ...form, car: e.target.value })} placeholder="현대 그랜저" /></Field>
            <Field label="메모"><Input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} /></Field>
            <Field label="페이지명"><Input value={form.pageName} onChange={(e) => setForm({ ...form, pageName: e.target.value })} /></Field>
            <Field label="매체"><Input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} placeholder="메타" /></Field>
          </div>
          <Field label="광고소재명"><Input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} /></Field>
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
