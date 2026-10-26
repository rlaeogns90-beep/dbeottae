// 광고주 제안서 웹 보기 (디비어때.com/proposal). PPT와 같은 10장을 그대로 보여주고 PPT 파일도 내려받을 수 있다.
import type { Metadata } from "next";
import Link from "next/link";
import { ProposalDeck } from "@/components/proposal-deck";
import { Logo } from "@/components/ui";

export const metadata: Metadata = {
  title: "광고주 제안서",
  description: "DB어때 광고주 제안서. 신차 장기렌트 단독 실시간 DB, 건당 40,000원(VAT 별도), 결번이면 100% 환급.",
  alternates: { canonical: "/proposal" },
  openGraph: { url: "/proposal", title: "DB어때 광고주 제안서" },
};

export default function ProposalPage() {
  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="py-2" aria-label="DB어때 홈">
            <Logo size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <a href="/proposal/DB-eottae-proposal.pptx" download className="inline-flex h-9 items-center rounded-lg border border-[#d1d6db] bg-white px-3 text-sm font-semibold hover:bg-soft">
              PPT 받기
            </a>
            <Link href="/signup" className="inline-flex h-9 items-center rounded-lg bg-brand px-3 text-sm font-bold text-white hover:bg-brand-dark">
              가입 신청
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-10">
        <h1 className="sr-only">DB어때 광고주 제안서</h1>
        <p className="mb-4 text-center text-[13px] text-mute sm:hidden">휴대폰을 가로로 돌리면 더 크게 볼 수 있어요</p>
        <ProposalDeck />
        <p className="mt-8 text-center text-sm text-sub">
          문의 1600-7628 · 카카오톡 채널 마케팅을다루다 ·{" "}
          <Link href="/" className="font-semibold text-brand">
            디비어때.com
          </Link>
        </p>
      </main>
    </div>
  );
}
