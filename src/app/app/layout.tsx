import type { Metadata } from "next";
import { AdvertiserShell } from "@/components/shells";

// 로그인 후 화면은 검색엔진에 나오지 않게 한다.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdvertiserShell>{children}</AdvertiserShell>;
}
