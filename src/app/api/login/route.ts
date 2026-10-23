import { checkLogin } from "@/lib/accounts";
import { issueToken } from "@/lib/server/auth";
import { loadState } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";

export async function POST(req: Request) {
  const { loginId, password } = (await req.json()) as { loginId: string; password: string };
  const { data } = await loadState();
  const r = checkLogin(data, String(loginId ?? ""), String(password ?? ""), verifyPassword);
  if ("error" in r) return Response.json(r, { status: 400 });
  return Response.json({ role: r.role, id: r.id, token: issueToken(r.role, r.id) });
}
