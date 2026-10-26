// 상태 읽기. 로그인 전에는 메인 화면용으로 가린 상태만, 로그인 후에는 역할에 맞는 데이터만 준다.
// 관리자에게는 읽지 않은 알림도 함께 준다. 변경은 /api/action에서만 한다.
import { readToken, stillValid } from "@/lib/server/auth";
import { loadState } from "@/lib/server/db";
import { guarded, unreadAlerts } from "@/lib/server/ops";
import { forClient } from "@/lib/server/secrets";

export const dynamic = "force-dynamic";

export const GET = guarded("상태 읽기", async (req) => {
  const { rev, data } = await loadState();
  const who = readToken(req);
  const valid = who && stillValid(data, who) ? who : null;
  const alerts = valid?.role === "admin" ? await unreadAlerts() : undefined;
  return Response.json({
    rev,
    data: forClient(data, valid),
    alerts,
    // 화면은 토큰을 볼 수 없으므로 누구로 로그인했는지는 여기서 알려준다.
    me: valid ? { role: valid.role, id: valid.id } : null,
    session: valid ? "ok" : who ? "expired" : "none",
  });
});
