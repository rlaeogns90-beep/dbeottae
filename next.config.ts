import type { NextConfig } from "next";

// 스크립트 허용 정책(CSP)은 요청마다 일회용 코드를 넣어야 해서 src/middleware.ts에서 붙인다.
// 보안 헤더: 다른 사이트에 몰래 띄우기 금지, 형식 위장 금지, HTTPS 강제
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// 로그인 후 화면·API는 검색엔진에 나오지 않게 한다.
const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...["/app/:path*", "/app", "/admin/:path*", "/admin", "/partner/:path*", "/partner", "/api/:path*"].map((source) => ({ source, headers: noIndex })),
    ];
  },
  async redirects() {
    // 첫 페이지 주소는 / 하나로 (예전 /login 주소는 영구 이동)
    return [{ source: "/login", destination: "/", permanent: true }];
  },
};

export default nextConfig;
