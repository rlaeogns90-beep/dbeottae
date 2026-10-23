import type { Metadata } from "next";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "DB어때 · 자동차 단독 DB",
  description: "출처 확실, 1:1 단독, 건당 결제. 경쟁 전화 없는 DB, 계약률 높은 DB어때",
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
