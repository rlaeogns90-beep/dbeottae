"use client";

// 고객센터: 관리자에게 문의하고 답변을 받는다
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardHeader, cx, Empty, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useStore } from "@/lib/store";

interface Post { id: number; at: string; title: string; body: string; reply: string | null; replyAt: string | null }

export default function SupportPage() {
  const { api } = useStore();
  const [f, setF] = useState({ title: "", body: "" });
  const [rows, setRows] = useState<Post[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ rows: Post[] }>("/api/support");
    if (r.ok) setRows(r.data.rows);
  }, [api]);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await api<{ error?: string }>("/api/support", { op: "write", kind: "inquiry", ...f });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.data.error ?? "등록하지 못했습니다." });
    setF({ title: "", body: "" });
    setMsg({ ok: true, text: "문의가 등록됐습니다. 답변이 달리면 아래에 표시됩니다." });
    load();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="고객센터" desc="문의는 관리자만 볼 수 있고, 다른 광고주에게는 보이지 않습니다. 급한 일은 1600-7628로 전화해 주세요." />

      <Card>
        <CardHeader title="문의하기" />
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="제목" required><Input value={f.title} maxLength={100} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="내용" required><Textarea rows={6} value={f.body} maxLength={3000} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          {msg && <p className={cx("text-[13px]", msg.ok ? "text-ok" : "text-bad")}>{msg.text}</p>}
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || !f.title.trim() || !f.body.trim()}>{busy ? "등록 중…" : "문의 등록"}</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="내 문의" />
        {rows === null ? null : rows.length === 0 ? (
          <Empty title="등록한 문의가 없습니다" />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-page">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{p.title}</span>
                    <span className="tabular text-xs text-mute">{dateTime(p.at)}</span>
                  </span>
                  <Badge tone={p.reply ? "green" : "orange"}>{p.reply ? "답변 완료" : "답변 대기"}</Badge>
                </button>
                {open === p.id && (
                  <div className="space-y-3 bg-page px-5 py-4 text-sm">
                    <p className="whitespace-pre-wrap">{p.body}</p>
                    {p.reply && (
                      <div className="rounded-lg border border-line bg-white p-4">
                        <p className="mb-1 text-xs font-semibold text-brand">관리자 답변 {p.replyAt && <span className="tabular font-normal text-mute">· {dateTime(p.replyAt)}</span>}</p>
                        <p className="whitespace-pre-wrap">{p.reply}</p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
