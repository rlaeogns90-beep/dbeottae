// 로그아웃: 로그인 쿠키를 지운다.
import { clearCookie } from "@/lib/server/auth";

export async function POST() {
  return Response.json({ ok: true }, { headers: { "set-cookie": clearCookie() } });
}
