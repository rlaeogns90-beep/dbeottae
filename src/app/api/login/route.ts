// 로그인. 같은 IP는 15분에 20번, 같은 아이디는 15분에 5번 틀리면 잠깐 막는다.
import { checkLogin } from "@/lib/accounts";
import { findUser, issueToken } from "@/lib/server/auth";
import { loadState } from "@/lib/server/db";
import { alert, audit, clearFailures, clientIp, countFailure, guarded, overLimit, tooMany } from "@/lib/server/ops";
import { verifyPassword } from "@/lib/server/password";

const WINDOW = 15 * 60;

export const POST = guarded("로그인", async (req) => {
  const ip = clientIp(req);
  const body = (await req.json().catch(() => ({}))) as { loginId?: unknown; password?: unknown };
  const loginId = String(body.loginId ?? "").slice(0, 50);
  const password = String(body.password ?? "").slice(0, 200);
  if (await overLimit(`login-ip:${ip}`, 20, WINDOW)) return tooMany(15);
  if (await overLimit(`login-fail:${loginId}`, 5, WINDOW, false)) {
    await alert("warn", "로그인", `'${loginId}' 계정에 비밀번호가 5번 넘게 틀려 15분 동안 로그인을 막았습니다 (IP ${ip}).`);
    return Response.json({ error: "비밀번호를 여러 번 틀려 15분 동안 로그인할 수 없습니다." }, { status: 429 });
  }

  const { data } = await loadState();
  const r = checkLogin(data, loginId, password, verifyPassword);
  if ("error" in r) {
    await countFailure(`login-fail:${loginId}`);
    if (data.admins.some((a) => a.loginId === loginId)) await audit({ actor: loginId, role: "admin", action: "관리자 로그인 실패", ip });
    return Response.json(r, { status: 400 });
  }
  await clearFailures(`login-fail:${loginId}`);
  const user = findUser(data, r) as { name: string; tv?: number };
  if (r.role === "admin") await audit({ actor: user.name, role: "admin", action: "관리자 로그인", ip });
  return Response.json({ role: r.role, id: r.id, token: issueToken(r.role, r.id, user.tv ?? 0) });
});
