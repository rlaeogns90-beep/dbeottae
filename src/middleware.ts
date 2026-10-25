// 같은 사이트가 여러 주소로 열리지 않게 www·vercel.app 기본 주소는 대표 주소로 영구 이동시킨다.
// (미리보기 배포 주소 db-eottae-xxxx.vercel.app은 그대로 둔다)
import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_HOST = "xn--2z1b5dx00av2h.com";
const ALIASES = new Set(["www.xn--2z1b5dx00av2h.com", "db-eottae.vercel.app"]);

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  if (!ALIASES.has(host)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.protocol = "https";
  url.host = CANONICAL_HOST;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  // 웹훅·백업 같은 API 호출은 주소를 바꾸지 않는다 (POST가 이동되면 실패할 수 있음).
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};
