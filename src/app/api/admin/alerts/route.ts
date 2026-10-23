// 관리자 알림 목록과 확인 처리
import { adminFrom, forbidden, guarded, listAlerts, markAlertsRead } from "@/lib/server/ops";

export const dynamic = "force-dynamic";

export const GET = guarded("알림", async (req) => {
  if (!(await adminFrom(req))) return forbidden();
  return Response.json({ rows: await listAlerts(100) });
});

export const POST = guarded("알림", async (req) => {
  if (!(await adminFrom(req))) return forbidden();
  const { ids } = (await req.json().catch(() => ({}))) as { ids?: number[] | "all" };
  await markAlertsRead(ids === "all" ? "all" : Array.isArray(ids) ? ids.filter((n) => Number.isInteger(n)) : []);
  return Response.json({ ok: true });
});
