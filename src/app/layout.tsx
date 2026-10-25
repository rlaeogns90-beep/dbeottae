import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const description =
  "신차 장기렌트 단독 실시간 DB를 건당 40,000원(VAT 별도)에. 고객이 직접 신청한 DB를 한 명의 광고주에게만 10초 안에 카카오 알림톡으로 보냅니다. 패키지 없이 받은 만큼만, 결번이면 100% 환급.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "DB어때(디비어때) · 자동차 단독 DB", template: "%s · DB어때" },
  description,
  applicationName: "DB어때",
  keywords: ["DB어때", "디비어때", "자동차 DB", "신차 장기렌트 DB", "장기렌트 DB 구매", "단독 DB", "실시간 DB", "CPA", "영업사원 DB", "자동차 영업 DB"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "DB어때",
    title: "DB어때(디비어때) · 경쟁 전화 없는 자동차 단독 DB",
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "DB어때 · 영업사원을 위한 DB 오픈 마켓" }],
  },
  twitter: { card: "summary_large_image", title: "DB어때(디비어때) · 자동차 단독 DB", description, images: ["/og.png"] },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
