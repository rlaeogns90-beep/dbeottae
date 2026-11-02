"use client";

// 메인·광고주 화면 오른쪽 아래 상담 챗봇. 외부 AI 없이 chatbot-kb의 정해 둔 답만 보여준다.
// 광고주는 못 푼 질문을 관리자 문의로 남기고 답을 이 창에서 본다. 메인 화면은 서버로 아무것도 보내지 않는다.
import { MessageCircle, Send, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CallButton, KakaoButton } from "@/components/contact";
import { Textarea } from "@/components/ui";
import { answer, MISS, quickTopics, REFUSAL, type Mode, type Topic } from "@/lib/chatbot-kb";
import { inquiryTitle, isUnread, type Inquiry } from "@/lib/inquiry";
import { useStore } from "@/lib/store";

type Msg =
  | { from: "me"; text: string }
  // handoff: 사람에게 넘기기 버튼을 붙인다. ask는 문의 칸에 미리 넣을 질문.
  | { from: "bot"; text: string; title?: string; topic?: Topic; handoff?: { ask: string }; contact?: boolean };

const hello: Record<Mode, Msg> = {
  main: { from: "bot", text: "안녕하세요, DB어때입니다. 가격, 불량 환급, 가입 방법 등 궁금한 점을 물어보세요." },
  advertiser: {
    from: "bot",
    text: "안녕하세요, DB어때입니다. 충전, 수신, 불량 처리 등 이용 방법을 물어보세요. 답을 찾지 못하면 관리자에게 문의를 남길 수 있어요.",
  },
};

const DONE = "문의가 접수됐어요. 답변이 오면 이 창에 표시되고 버튼에 빨간 점이 떠요.";

// 광고주 화면은 휴대폰에서 아래 메뉴 막대가 있어 그 위로 띄운다(md부터 막대가 없다).
const place: Record<Mode, { button: string; panel: string }> = {
  main: {
    button: "right-4 bottom-4 sm:right-6 sm:bottom-6",
    panel: "inset-x-3 bottom-20 max-h-[min(560px,calc(100dvh-7rem))] sm:inset-x-auto sm:right-6 sm:bottom-24",
  },
  advertiser: {
    button: "right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:right-6 md:bottom-6",
    panel:
      "inset-x-3 bottom-[calc(8.75rem+env(safe-area-inset-bottom))] max-h-[min(560px,calc(100dvh-12rem))] sm:inset-x-auto sm:right-6 md:bottom-24 md:max-h-[min(560px,calc(100dvh-7rem))]",
  },
};

const qa = (p: Inquiry) => `문의: ${p.body}\n답변: ${p.reply ?? "답변 대기 중"}`;

export function Chatbot({ mode }: { mode: Mode }) {
  const { api } = useStore();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([hello[mode]]);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Inquiry[]>([]);
  // 이 화면에서 이미 보여준 답변(문의 id → 답변 시각). 서버 읽음 기록이 반영되기 전에 목록을 다시 받아도 점이 다시 뜨지 않게 한다.
  const [shown, setShown] = useState<Record<number, string>>({});
  const end = useRef<HTMLDivElement>(null);
  const advertiser = mode === "advertiser";

  // api는 상태를 새로 받을 때마다(4초) 바뀐다. 그대로 의존하면 문의 목록도 4초마다 다시 받으므로 ref로 붙잡아 둔다.
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);
  const load = useCallback(async () => {
    const r = await apiRef.current<{ rows?: Inquiry[] }>("/api/support");
    if (r.ok) setRows(r.data.rows ?? []);
    return r.ok ? (r.data.rows ?? []) : null;
  }, []);
  // 문의 목록은 처음, 1분마다, 창을 열 때 받는다.
  useEffect(() => {
    if (!advertiser) return;
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000);
    return () => clearInterval(t);
  }, [advertiser, load]);

  // 중괄호 필수: 최신 브라우저의 scrollIntoView는 Promise를 돌려줘서, 그대로 반환하면 React가 정리 함수로 보고 화면이 깨진다.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs, open, draft]);

  const unreadOf = (list: Inquiry[]) => list.filter((p) => isUnread(p) && shown[p.id] !== p.replyAt);
  const unread = unreadOf(rows);
  const say = (...m: Msg[]) => setMsgs((prev) => [...prev, ...m]);

  const toggle = async () => {
    if (open) return setOpen(false);
    setOpen(true);
    if (!advertiser) return;
    // 열 때 목록을 새로 받아서 보여준 답만 읽음으로 남긴다 (못 본 답이 읽음 처리되지 않게).
    const fresh = unreadOf((await load()) ?? rows);
    if (!fresh.length) return;
    say(...fresh.map((p, i): Msg => ({ from: "bot", title: i === 0 ? "지난 문의에 답변이 왔어요" : undefined, text: qa(p) })));
    setShown((s) => ({ ...s, ...Object.fromEntries(fresh.map((p) => [p.id, p.replyAt!])) }));
    apiRef.current("/api/support", { op: "seen" });
  };

  const ask = (q: string, picked?: Topic) => {
    const r = picked ? ({ kind: "topic", topic: picked } as const) : answer(q, mode);
    const handoff = { ask: picked ? "" : q };
    const reply: Msg =
      r.kind === "blocked"
        ? { from: "bot", text: REFUSAL, handoff }
        : r.kind === "miss"
          ? { from: "bot", text: MISS, handoff }
          : {
              from: "bot",
              title: r.topic.q === q ? undefined : r.topic.q,
              text: r.topic.a,
              topic: r.topic,
              contact: r.topic.contact,
              // 광고주가 고객센터를 찾으면 전화·카톡과 함께 문의 남기기도 준다.
              handoff: r.topic.id === "ask-admin" || (advertiser && r.topic.contact) ? handoff : undefined,
            };
    say({ from: "me", text: q }, reply);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    setText("");
    ask(q.slice(0, 200));
  };

  const send = async () => {
    const body = (draft ?? "").trim();
    if (!body || busy) return;
    setBusy(true);
    const r = await api<{ error?: string }>("/api/support", { op: "write", kind: "inquiry", title: inquiryTitle(body), body });
    setBusy(false);
    // 실패하면 쓴 글은 그대로 두고, 급한 경우를 위해 전화·카톡도 보여준다.
    if (!r.ok) return say({ from: "bot", text: r.data.error ?? "문의를 보내지 못했어요.", contact: true });
    setDraft(null);
    say({ from: "bot", text: DONE });
    load();
  };

  const showMine = () =>
    say(
      rows.length
        ? { from: "bot", title: "내 문의", text: rows.slice(0, 5).map(qa).join("\n\n") }
        : { from: "bot", text: "아직 남긴 문의가 없어요." },
    );

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="DB어때 상담 챗봇"
          className={`fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(0,0,0,0.16)] sm:w-[370px] ${place[mode].panel}`}
        >
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <div>
              <p className="text-[15px] font-bold">DB어때 상담봇</p>
              <p className="text-xs text-white/80">{advertiser ? "이용 방법 안내 · 관리자 문의" : "자주 묻는 질문에 바로 답해 드려요"}</p>
            </div>
            <div className="flex items-center gap-1">
              {advertiser && (
                <button type="button" onClick={showMine} className="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-white/15">
                  내 문의 보기
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="챗봇 닫기" className="-mr-1 rounded-lg p-1.5 hover:bg-white/15">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-page px-3 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === "me" ? "flex justify-end" : "flex justify-start"}>
                {m.from === "me" ? (
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2.5 text-sm text-white">{m.text}</div>
                ) : (
                  <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink">
                    {m.title && <p className="mb-1 font-bold">{m.title}</p>}
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    {m.topic?.links?.map(([href, label]) => (
                      <Link key={href} href={href} onClick={() => setOpen(false)} className="mt-2.5 mr-2 inline-flex h-9 items-center rounded-lg bg-brand px-3 text-[13px] font-bold text-white hover:bg-brand-dark">
                        {label}
                      </Link>
                    ))}
                    {(m.contact || (m.handoff && !advertiser)) && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <CallButton solid className="h-9 text-[13px]" />
                        <KakaoButton className="h-9 text-[13px]" />
                      </div>
                    )}
                    {m.handoff && advertiser && (
                      <button
                        type="button"
                        onClick={() => setDraft(m.handoff!.ask)}
                        className="mt-2.5 inline-flex h-9 items-center rounded-lg bg-brand px-3 text-[13px] font-bold text-white hover:bg-brand-dark"
                      >
                        관리자에게 문의 남기기
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickTopics(mode).map((tp) => (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => ask(tp.q, tp)}
                  className="rounded-full border border-brand/30 bg-white px-3 py-1.5 text-[13px] font-semibold text-brand hover:bg-brand-soft"
                >
                  {tp.q}
                </button>
              ))}
            </div>
            <div ref={end} />
          </div>

          {draft !== null ? (
            <div className="space-y-2 border-t border-line bg-white p-2.5">
              <p className="text-[13px] font-semibold text-sub">관리자에게 보낼 문의</p>
              <Textarea rows={3} maxLength={1000} value={draft} placeholder="문의 내용을 적어 주세요" aria-label="문의 내용" onChange={(e) => setDraft(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDraft(null)} className="h-9 rounded-lg px-3 text-[13px] font-semibold text-sub hover:bg-soft">
                  취소
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={busy || !draft.trim()}
                  className="h-9 rounded-lg bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {busy ? "보내는 중…" : "보내기"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="flex gap-2 border-t border-line bg-white p-2.5">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="궁금한 점을 입력하세요"
                maxLength={200}
                aria-label="질문 입력"
                className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-base outline-none focus:border-brand sm:text-sm"
              />
              <button type="submit" aria-label="보내기" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-dark">
                <Send size={17} />
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "챗봇 닫기" : unread.length ? "챗봇 열기, 새 답변 있음" : "챗봇 열기"}
        aria-expanded={open}
        className={`fixed z-40 inline-flex h-14 items-center gap-2 rounded-full bg-brand pr-5 pl-4 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(38,89,217,0.4)] hover:bg-brand-dark ${place[mode].button}`}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {open ? "닫기" : "궁금한 점 물어보기"}
        {!open && unread.length > 0 && <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-bad ring-2 ring-white" />}
      </button>
    </>
  );
}
