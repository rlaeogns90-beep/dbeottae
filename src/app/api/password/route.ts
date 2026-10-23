// 내 비밀번호 바꾸기: 지금 비밀번호를 확인한 뒤 새 비밀번호로 저장한다.
import { MIN_PASSWORD } from "@/lib/actions";
import { readToken } from "@/lib/server/auth";
import { mutate } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";
import type { State } from "@/lib/types";

export async function POST(req: Request) {
  const who = readToken(req);
  if (!who) return Response.json({ error: "다시 로그인해 주세요." }, { status: 401 });
  const { current, next } = (await req.json()) as { current: string; next: string };
  if (String(next ?? "").length < MIN_PASSWORD) return Response.json({ error: `새 비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.` }, { status: 400 });
  const error = await mutate((s) => {
    const key = who.role === "advertiser" ? "advertisers" : who.role === "partner" ? "partners" : "admins";
    const list = s[key] as State["admins"];
    const me = list.find((u) => u.id === who.id);
    if (!me || !verifyPassword(me.password, String(current ?? ""))) return { state: s, result: "지금 비밀번호가 맞지 않습니다." };
    return { state: { ...s, [key]: list.map((u) => (u.id === who.id ? { ...u, password: next } : u)) } as State, result: null };
  });
  return error ? Response.json({ error }, { status: 400 }) : Response.json({ ok: true });
}
