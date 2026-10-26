// 페이지 요청마다:
// 1) www·vercel.app 기본 주소는 대표 주소로 영구 이동 (같은 사이트가 여러 주소로 열리지 않게)
// 2) 일회용 허가 코드(nonce)를 만들어 보안 정책(CSP)에 넣는다. 이 코드가 붙은 스크립트만 실행되므로
//    누군가 페이지에 스크립트를 끼워 넣어도 실행되지 않는다. Next.js는 요청 헤더의 CSP에서 nonce를 읽어 자기 스크립트에 붙인다.
import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_HOST = "xn--2z1b5dx00av2h.com";
const ALIASES = new Set(["www.xn--2z1b5dx00av2h.com", "db-eottae.vercel.app"]);
const dev = process.env.NODE_ENV !== "production";

function csp(nonce: string) {
  return [
    "default-src 'self'",
    // 'strict-dynamic': nonce가 붙은 스크립트가 불러온 스크립트까지만 허용 (개발 중에는 eval도)
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "img-src 'self' data: blob:",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  if (ALIASES.has(host)) {
    const url = req.nextUrl.clone();
    url.protocol = "https";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", policy);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("content-security-policy", policy);
  return res;
}

export const config = {
  // API(웹훅·백업 등)와 정적 파일은 건드리지 않는다. 미리 불러오기(prefetch) 요청에도 nonce를 새로 만든다.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|og.png|logo.png|logo-tagline.png).*)"],
};
