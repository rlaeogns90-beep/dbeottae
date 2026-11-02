"use client";

// 첫 페이지 오른쪽 아래 상담 챗봇. 외부 AI 없이 자주 묻는 질문(faqs)과 아래 추가 안내에서 단어로 답을 찾는다.
// 맞는 답이 없으면 고객센터 전화·카카오톡으로 넘긴다. 서버로 아무것도 보내지 않는다.
import { MessageCircle, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CallButton, COMPANY, KakaoButton } from "@/components/contact";
import { faqs, industryOptions } from "@/lib/content";

interface Topic { q: string; a: string; words: string[]; link?: [string, string] }

const won = (n: number) => n.toLocaleString("ko-KR");
const live = industryOptions.filter((o) => o.live);

// faqs 순서와 같다. words는 질문에 들어 있으면 이 답을 고르는 단어들.
const faqWords: string[][] = [
  ["플랫폼", "뭐", "무엇", "어떤", "소개", "디비어때", "db어때"],
  ["수집", "어디서", "어디에서", "출처", "진짜", "허위", "조작"],
  ["가격", "얼마", "비용", "단가", "금액", "요금", "건당", "충전", "예치금", "환불"],
  ["빨리", "속도", "언제", "알림톡", "카카오", "몇초", "실시간"],
  ["on", "off", "끄", "켜", "수신", "멈", "중지", "쉬"],
  ["중복", "다른 사람", "다른사람", "단독", "공유", "여러"],
  ["불량", "결번", "환급", "없는 번호", "안 받", "안받"],
  ["시작", "가입", "신청", "추천인", "회원", "승인"],
];

const topics: Topic[] = [
  ...faqs.map(([q, a], i) => ({ q, a, words: faqWords[i] ?? [], link: i === 7 ? (["/signup", "광고주 가입 신청"] as [string, string]) : undefined })),
  {
    q: "어떤 업종 DB가 있나요?",
    a: `지금 받을 수 있는 업종은 ${live.map((o) => `${o.name}(건당 ${won(o.price ?? 0)}원)`).join(", ")}입니다. 모두 VAT 별도입니다. ${industryOptions.filter((o) => !o.live).map((o) => o.name).join(", ")}은 준비 중이며, 열리면 안내해 드립니다.`,
    words: ["업종", "종류", "오토바이", "중고차", "리스", "보험", "수출", "장기렌트", "렌트"],
  },
  {
    q: "상담원과 이야기하고 싶어요",
    a: `고객센터 ${COMPANY.tel}로 전화하시거나 카카오톡 채널 '${COMPANY.kakaoChannel}'로 남겨 주세요.`,
    words: ["상담원", "사람", "전화", "연락", "문의", "직원", "담당"],
  },
];

const quick = [topics[2], topics[8], topics[6], topics[7]];

function find(text: string): Topic | null {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  let best: Topic | null = null;
  let score = 0;
  for (const tp of topics) {
    const s = tp.words.reduce((n, w) => (t.includes(w) ? n + w.length : n), 0);
    if (s > score) [best, score] = [tp, s];
  }
  return best;
}

type Msg = { from: "bot" | "me"; text: string; topic?: Topic; miss?: boolean };

const hello: Msg = { from: "bot", text: "안녕하세요, DB어때입니다. 가격, 불량 환급, 가입 방법 등 궁금한 점을 물어보세요." };

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([hello]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [msgs, open]);

  const ask = (q: string, picked?: Topic) => {
    const topic = picked ?? find(q);
    setMsgs((m) => [
      ...m,
      { from: "me", text: q },
      topic
        ? { from: "bot", text: topic.a, topic }
        : { from: "bot", text: "그 질문에는 바로 답을 드리기 어려워요. 고객센터로 연락 주시면 자세히 안내해 드릴게요.", miss: true },
    ]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    setText("");
    ask(q.slice(0, 200));
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="DB어때 상담 챗봇"
          className="fixed inset-x-3 bottom-20 z-40 flex max-h-[min(560px,calc(100dvh-7rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(0,0,0,0.16)] sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[370px]"
        >
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <div>
              <p className="text-[15px] font-bold">DB어때 상담봇</p>
              <p className="text-xs text-white/80">자주 묻는 질문에 바로 답해 드려요</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="챗봇 닫기" className="-mr-1 rounded-lg p-1.5 hover:bg-white/15">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-page px-3 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === "me" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.from === "me"
                      ? "max-w-[80%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2.5 text-sm text-white"
                      : "max-w-[88%] rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink"
                  }
                >
                  {m.topic && m.topic.q !== msgs[i - 1]?.text && <p className="mb-1 font-bold">{m.topic.q}</p>}
                  <p>{m.text}</p>
                  {m.topic?.link && (
                    <Link href={m.topic.link[0]} className="mt-2.5 inline-flex h-9 items-center rounded-lg bg-brand px-3 text-[13px] font-bold text-white hover:bg-brand-dark">
                      {m.topic.link[1]}
                    </Link>
                  )}
                  {(m.miss || m.topic === topics[9]) && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <CallButton solid className="h-9 text-[13px]" />
                      <KakaoButton className="h-9 text-[13px]" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quick.map((tp) => (
                <button
                  key={tp.q}
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
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "챗봇 닫기" : "챗봇 열기"}
        aria-expanded={open}
        className="fixed right-4 bottom-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-brand pr-5 pl-4 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(38,89,217,0.4)] hover:bg-brand-dark sm:right-6 sm:bottom-6"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {open ? "닫기" : "궁금한 점 물어보기"}
      </button>
    </>
  );
}
