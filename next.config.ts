import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// 보안 헤더: 다른 사이트에 몰래 띄우기 금지, 허용한 곳의 스크립트·스타일만 실행, HTTPS 강제
const csp = [
  "default-src 'self'",
  // Next.js가 페이지에 넣는 인라인 스크립트 때문에 'unsafe-inline'이 필요하다 (개발 중에는 eval도).
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "img-src 'self' data: blob:",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
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
