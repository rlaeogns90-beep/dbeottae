// 상태 읽기. 로그인 전에는 메인 화면용으로 가린 상태만, 로그인 후에는 역할에 맞는 데이터만 준다.
// 변경은 /api/action에서 권한을 확인한 뒤에만 저장한다.
import { readToken, stillValid } from "@/lib/server/auth";
import { loadState } from "@/lib/server/db";
import { forClient } from "@/lib/server/secrets";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { rev, data } = await loadState();
  const who = readToken(req);
  const valid = who && stillValid(data, who) ? who : null;
  return Response.json({ rev, data: forClient(data, valid), session: valid ? "ok" : who ? "expired" : "none" });
}
