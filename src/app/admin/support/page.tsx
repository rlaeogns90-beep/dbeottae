"use client";

// 고객센터 관리: 광고주 문의에 답변한다. (관리자만 볼 수 있다)
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, ConfirmButton, cx, Empty, PageHeader, Textarea } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useStore } from "@/lib/store";

interface Post {
  id: number; at: string; title: string; body: string; reply: string | null; replyAt: string | null;
  author: { name: string; company: string; phone: string };
}

export default function AdminSupportPage() {
  const { api } = useStore();
  const [rows, setRows] = useState<Post[] | null>(null);
  const [tab, setTab] = useState<"all" | "todo">("todo");
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ rows: Post[] }>("/api/support");
    if (r.ok) setRows(r.data.rows);
  }, [api]);
  useEffect(() => {
    load();
  }, [load]);

  const list = (rows ?? []).filter((p) => (tab === "todo" ? !p.reply : true));
  const todo = (rows ?? []).filter((p) => !p.reply).length;
  const tabs = [["todo", `답변 대기 ${todo}`], ["all", "전체"]] as const;

  const send = async (id: number, op: "reply" | "delete") => {
    setErr(null);
    const r = await api<{ error?: string }>("/api/support", op === "reply" ? { op, id, reply: draft } : { op, id });
    if (!r.ok) return setErr(r.data.error ?? "처리하지 못했습니다.");
    setDraft("");
    if (op === "delete") setOpen(null);
    load();
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="고객센터" desc="광고주 문의에 답변합니다. 이 화면은 관리자만 볼 수 있습니다." />
      <div className="mb-4 inline-flex rounded-lg bg-soft p-0.5">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx("h-9 rounded-md px-4 text-sm font-semibold whitespace-nowrap", tab === k ? "bg-white text-ink shadow-sm" : "text-mute hover:text-sub")}>
            {label}
          </button>
        ))}
      </div>
      <Card>
        {rows === null ? null : list.length === 0 ? (
          <Empty title={tab === "todo" ? "답변 대기 중인 문의가 없습니다" : "등록된 문의가 없습니다"} />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => { setOpen(open === p.id ? null : p.id); setDraft(p.reply ?? ""); setErr(null); }} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-page">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{p.title}</span>
                    <span className="tabular text-xs text-mute">
                      {p.author.name}{p.author.company ? ` · ${p.author.company}` : ""} · {dateTime(p.at)}
                    </span>
                  </span>
                  <Badge tone={p.reply ? "green" : "orange"}>{p.reply ? "답변 완료" : "답변 대기"}</Badge>
                </button>
                {open === p.id && (
                  <div className="space-y-3 bg-page px-5 py-4 text-sm">
                    <p className="text-xs text-mute">연락처 {p.author.phone}</p>
                    <p className="whitespace-pre-wrap">{p.body}</p>
                    <div className="space-y-2">
                      <Textarea rows={4} placeholder="답변을 입력해 주세요" value={draft} onChange={(e) => setDraft(e.target.value)} />
                      <div className="flex items-center gap-2">
                        <Button size="sm" disabled={!draft.trim()} onClick={() => send(p.id, "reply")}>{p.reply ? "답변 수정" : "답변 등록"}</Button>
                        <ConfirmButton variant="secondary" size="sm" confirmLabel="정말 삭제" onConfirm={() => send(p.id, "delete")}>삭제</ConfirmButton>
                      </div>
                    </div>
                    {err && <p className="text-[13px] text-bad">{err}</p>}
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
