// 매일 자동 백업 (Vercel Cron이 호출, CRON_SECRET으로 확인). 실패하면 관리자 알림을 남긴다.
import { alert, createBackup } from "@/lib/server/ops";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return Response.json({ error: "권한이 없습니다." }, { status: 401 });
  try {
    await createBackup();
    return Response.json({ ok: true });
  } catch (e) {
    await alert("error", "백업", `매일 자동 백업에 실패했습니다: ${e instanceof Error ? e.message : String(e)}`);
    return Response.json({ ok: false }, { status: 500 });
  }
}
