// 로그인 토큰: {role, id, 만료}를 서명해 둔 문자열. 비밀값은 AUTH_SECRET 환경변수.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Session, State } from "../types";

const DAYS = 30;
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET 환경변수가 없습니다.");
  return s;
};
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function issueToken(role: Session["role"], id: string) {
  const body = Buffer.from(JSON.stringify({ role, id, exp: Date.now() + DAYS * 86400_000 })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken(req: Request): Session | null {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as { role: Session["role"]; id: string; exp: number };
    return p.exp > Date.now() ? { role: p.role, id: p.id } : null;
  } catch {
    return null;
  }
}

/** 토큰이 가리키는 계정이 아직 있고 이용 가능한지 */
export function stillValid(s: State, who: Session) {
  if (who.role === "admin") return s.admins.some((a) => a.id === who.id);
  const list = who.role === "advertiser" ? s.advertisers : s.partners;
  return list.some((u) => u.id === who.id && u.status === "approved");
}
