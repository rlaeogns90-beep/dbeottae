// 백업 목록(관리자), 지금 백업·복원(마스터)
import { adminFrom, alert, audit, clientIp, createBackup, forbidden, guarded, listBackups, restoreBackup } from "@/lib/server/ops";

export const dynamic = "force-dynamic";

export const GET = guarded("백업", async (req) => {
  if (!(await adminFrom(req))) return forbidden();
  return Response.json({ rows: await listBackups() });
});

export const POST = guarded("백업", async (req) => {
  const admin = await adminFrom(req, true);
  if (!admin) return forbidden();
  const { action, id } = (await req.json().catch(() => ({}))) as { action?: string; id?: number };
  if (action === "create") {
    await createBackup();
    await audit({ actor: admin.name, role: "admin", action: "백업 만들기", ip: clientIp(req) });
    return Response.json({ ok: true });
  }
  if (action === "restore" && Number.isInteger(id)) {
    const error = await restoreBackup(id!);
    if (error) return Response.json({ error }, { status: 400 });
    await audit({ actor: admin.name, role: "admin", action: "백업으로 복원", detail: `백업 #${id}`, ip: clientIp(req) });
    await alert("warn", "백업", `${admin.name}님이 백업 #${id} 시점으로 데이터를 되돌렸습니다.`);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
});
