// 예시 데이터 초기화 (마스터 관리자만)
import { readToken } from "@/lib/server/auth";
import { freshSeed, loadState, saveState } from "@/lib/server/db";

export async function POST(req: Request) {
  const who = readToken(req);
  const { rev, data } = await loadState();
  if (who?.role !== "admin" || !data.admins.find((a) => a.id === who.id)?.master)
    return Response.json({ error: "마스터 관리자만 초기화할 수 있습니다." }, { status: 403 });
  await saveState(rev, freshSeed());
  return Response.json({ ok: true });
}
