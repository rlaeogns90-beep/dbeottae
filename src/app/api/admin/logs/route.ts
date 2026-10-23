// 보안 기록 (마스터만): 관리자 로그인·실패, 관리자 작업, 비밀번호 변경
import { adminFrom, forbidden, guarded, listAudit } from "@/lib/server/ops";

export const dynamic = "force-dynamic";

export const GET = guarded("보안 기록", async (req) => {
  if (!(await adminFrom(req, true))) return forbidden();
  return Response.json({ rows: await listAudit() });
});
