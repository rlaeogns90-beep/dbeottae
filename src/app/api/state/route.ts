// 전체 상태 읽기·저장. 로그인 전에는 메인 화면용으로 가린 상태만 준다.
import { readToken, stillValid } from "@/lib/server/auth";
import { loadState, saveState } from "@/lib/server/db";
import { forClient, restoreSecrets } from "@/lib/server/secrets";
import type { State } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { rev, data } = await loadState();
  const who = readToken(req);
  const valid = who && stillValid(data, who) ? who : null;
  return Response.json({ rev, data: forClient(data, valid), session: valid ? "ok" : who ? "expired" : "none" });
}

export async function PUT(req: Request) {
  const { rev, data } = await loadState();
  const who = readToken(req);
  if (!who || !stillValid(data, who)) return Response.json({ error: "다시 로그인해 주세요." }, { status: 401 });
  const body = (await req.json()) as { rev: number; data: State };
  if (body.rev !== rev) return Response.json({ rev, data: forClient(data, who) }, { status: 409 });
  const saved = await saveState(rev, restoreSecrets(data, body.data));
  if (saved === null) {
    const latest = await loadState();
    return Response.json({ rev: latest.rev, data: forClient(latest.data, who) }, { status: 409 });
  }
  return Response.json({ rev: saved });
}
