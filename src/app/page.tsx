// 디비어때.com 첫 페이지. 화면은 MainPage(클라이언트), 검색엔진용 정보(제목·설명·구조화 데이터)는 여기서 넣는다.
import type { Metadata } from "next";
import { COMPANY } from "@/components/contact";
import { MainPage } from "@/components/main-page";
import { faqs } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "DB어때(디비어때) · 신차 장기렌트 단독 DB 구매 · 건당 40,000원" },
  alternates: { canonical: "/" },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DB어때",
    alternateName: ["디비어때", COMPANY.name],
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    telephone: COMPANY.tel,
    address: { "@type": "PostalAddress", streetAddress: COMPANY.address, addressCountry: "KR" },
    sameAs: [COMPANY.kakaoUrl.replace(/\/chat$/, "")],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DB어때",
    alternateName: "디비어때",
    url: SITE_URL,
    inLanguage: "ko-KR",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  },
];

export default function Home() {
  // JSON-LD는 실행되는 스크립트가 아니라 데이터라서 보안 정책(nonce)이 필요 없다.
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
      <MainPage />
    </>
  );
}
