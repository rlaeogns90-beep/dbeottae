// 광고주 가입 신청. 가입 후 관리자 승인이 있어야 쓸 수 있어 횟수 제한은 두지 않는다.
import { signup, type SignupInput } from "@/lib/accounts";
import { mutate } from "@/lib/server/db";
import { guarded } from "@/lib/server/ops";

export const POST = guarded("가입 신청", async (req) => {
  const input = (await req.json().catch(() => null)) as SignupInput | null;
  if (!input || typeof input !== "object") return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const error = await mutate((s) => {
    const r = signup(s, input);
    return "error" in r ? { state: s, result: r.error } : { state: r.state, result: null };
  });
  return error ? Response.json({ error }, { status: 400 }) : Response.json({ ok: true });
});
