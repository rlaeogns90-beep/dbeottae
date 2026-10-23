// 내 비밀번호 바꾸기: 지금 비밀번호를 확인한 뒤 저장하고, 다른 기기의 로그인은 모두 끊는다.
import { MIN_PASSWORD } from "@/lib/actions";
import { issueToken, readToken, stillValid } from "@/lib/server/auth";
import { loadState, mutate } from "@/lib/server/db";
import { audit, clientIp, guarded, overLimit, tooMany } from "@/lib/server/ops";
import { verifyPassword } from "@/lib/server/password";
import type { State } from "@/lib/types";

export const POST = guarded("비밀번호 변경", async (req) => {
  const who = readToken(req);
  if (!who || !stillValid((await loadState()).data, who)) return Response.json({ error: "다시 로그인해 주세요." }, { status: 401 });
  if (await overLimit(`password:${who.id}`, 5, 15 * 60)) return tooMany(15);
  const { current, next } = (await req.json().catch(() => ({}))) as { current?: string; next?: string };
  if (typeof next !== "string" || next.length < MIN_PASSWORD || next.length > 100)
    return Response.json({ error: `새 비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.` }, { status: 400 });

  const result = await mutate<{ error: string } | { tv: number; name: string }>((s) => {
    const key = who.role === "advertiser" ? "advertisers" : who.role === "partner" ? "partners" : "admins";
    const list = s[key] as State["admins"];
    const me = list.find((u) => u.id === who.id);
    if (!me || !verifyPassword(me.password, String(current ?? ""))) return { state: s, result: { error: "지금 비밀번호가 맞지 않습니다." } };
    const tv = (me.tv ?? 0) + 1;
    return { state: { ...s, [key]: list.map((u) => (u.id === who.id ? { ...u, password: next, tv } : u)) } as State, result: { tv, name: me.name } };
  });
  if ("error" in result) return Response.json(result, { status: 400 });
  await audit({ actor: result.name, role: who.role, action: "비밀번호 변경", ip: clientIp(req) });
  // 지금 쓰는 기기는 새 토큰으로 계속 로그인 상태를 유지한다.
  return Response.json({ ok: true, token: issueToken(who.role, who.id, result.tv) });
});
