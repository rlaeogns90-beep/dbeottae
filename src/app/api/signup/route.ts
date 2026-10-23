// 광고주 가입 신청. 같은 IP는 1시간에 5번까지.
import { signup, type SignupInput } from "@/lib/accounts";
import { mutate } from "@/lib/server/db";
import { clientIp, guarded, overLimit, tooMany } from "@/lib/server/ops";

export const POST = guarded("가입 신청", async (req) => {
  if (await overLimit(`signup:${clientIp(req)}`, 5, 3600)) return tooMany(60);
  const input = (await req.json().catch(() => null)) as SignupInput | null;
  if (!input || typeof input !== "object") return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const error = await mutate((s) => {
    const r = signup(s, input);
    return "error" in r ? { state: s, result: r.error } : { state: r.state, result: null };
  });
  return error ? Response.json({ error }, { status: 400 }) : Response.json({ ok: true });
});
