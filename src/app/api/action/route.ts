// 변경 작업 1건을 받아 권한을 확인하고 최신 상태에 적용해 저장한다.
import { runAction, type Action } from "@/lib/actions";
import { readToken, stillValid } from "@/lib/server/auth";
import { loadState, mutate } from "@/lib/server/db";

export async function POST(req: Request) {
  const who = readToken(req);
  if (!who || !stillValid((await loadState()).data, who)) return Response.json({ error: "다시 로그인해 주세요." }, { status: 401 });
  const action = (await req.json()) as Action;
  const error = await mutate((s) => {
    if (!stillValid(s, who)) return { state: s, result: "다시 로그인해 주세요." };
    const r = runAction(s, who, action);
    return "error" in r ? { state: s, result: r.error } : { state: r.state, result: null };
  });
  return error ? Response.json({ error }, { status: 400 }) : Response.json({ ok: true });
}
