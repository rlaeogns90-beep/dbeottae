import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "광고주 가입 신청",
  description: "DB어때 광고주 가입 신청. 추천인 아이디로 가입하고 관리자 승인 후 예치금을 충전하면 신차 장기렌트 단독 DB를 바로 받을 수 있습니다.",
  alternates: { canonical: "/signup" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
