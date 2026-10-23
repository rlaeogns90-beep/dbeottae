"use client";

// 이용약관·개인정보처리방침 공통 화면. 본문은 [제목, 문단들] 목록으로 받는다.
// 문단이 배열이면 번호 목록, [머리글, 행...] 튜플 배열이면 표로 그린다.
import Link from "next/link";
import { SiteFooter } from "./contact";
import { Logo } from "./ui";

export type Para = string | string[] | { table: string[][] };
export type Section = [string, Para[]];

export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: Section[] }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:h-[68px] sm:px-6">
          <Link href="/login"><Logo size={22} /></Link>
          <nav className="flex gap-4 text-sm font-semibold text-sub">
            <Link href="/terms" className="hover:text-ink">이용약관</Link>
            <Link href="/privacy" className="hover:text-ink">개인정보처리방침</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em] sm:text-[32px]">{title}</h1>
        <p className="mt-2 text-sm text-mute">{updated}</p>
        <p className="mt-6 text-[15px] leading-relaxed text-sub">{intro}</p>

        <nav aria-label="목차" className="mt-8 rounded-2xl bg-page p-5">
          <p className="mb-2 text-[13px] font-bold text-sub">목차</p>
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {sections.map(([h], i) => (
              <li key={h}><a href={`#s${i + 1}`} className="text-sub hover:text-brand">{h}</a></li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map(([h, paras], i) => (
            <section key={h} id={`s${i + 1}`} className="scroll-mt-6">
              <h2 className="text-lg font-bold">{h}</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-sub">
                {paras.map((p, j) =>
                  typeof p === "string" ? (
                    <p key={j}>{p}</p>
                  ) : Array.isArray(p) ? (
                    <ol key={j} className="list-decimal space-y-1.5 pl-5">
                      {p.map((li) => <li key={li}>{li}</li>)}
                    </ol>
                  ) : (
                    <div key={j} className="overflow-x-auto rounded-xl border border-line">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead className="bg-page text-[13px] text-ink">
                          <tr>{p.table[0].map((c) => <th key={c} className="px-4 py-2.5 font-semibold">{c}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {p.table.slice(1).map((row, r) => (
                            <tr key={r}>{row.map((c, k) => <td key={k} className="px-4 py-2.5 align-top">{c}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
