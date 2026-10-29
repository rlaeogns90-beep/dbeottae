// 매일 자동 백업 (Vercel Cron이 호출, CRON_SECRET으로 확인). 실패하면 관리자 알림을 남긴다.
// 구글 시트 백업이 켜져 있으면 최근 3일 치 DB도 시트와 맞춘다 (재배정·불량 처리 반영, 빠진 건 보충).
import { loadState } from "@/lib/server/db";
import { alert, createBackup } from "@/lib/server/ops";
import { pushToSheet, recentSheetRows, sheetEnabled } from "@/lib/server/sheet";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return Response.json({ error: "권한이 없습니다." }, { status: 401 });
  try {
    await createBackup();
  } catch (e) {
    await alert("error", "백업", `매일 자동 백업에 실패했습니다: ${e instanceof Error ? e.message : String(e)}`);
    return Response.json({ ok: false }, { status: 500 });
  }
  let sheet: boolean | null = null;
  if (sheetEnabled()) {
    try {
      const { data } = await loadState();
      sheet = await pushToSheet(recentSheetRows(data, 3));
    } catch (e) {
      await alert("warn", "구글시트", `시트 백업에 실패했습니다: ${e instanceof Error ? e.message : String(e)}`);
      sheet = false;
    }
  }
  return Response.json({ ok: true, sheet });
}
