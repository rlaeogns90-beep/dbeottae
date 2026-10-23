// 로그인 토큰: {role, id, 토큰 버전, 만료}를 서명해 둔 문자열. 비밀값은 AUTH_SECRET 환경변수.
// 비밀번호를 바꾸면 계정의 토큰 버전(tv)이 올라가 예전 토큰은 더 이상 통하지 않는다.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Session, State } from "../types";

/** 관리자는 12시간, 광고주·영업자는 30일 동안 로그인이 유지된다. */
const TTL: Record<Session["role"], number> = { admin: 12 * 3600_000, advertiser: 30 * 86400_000, partner: 30 * 86400_000 };

export type Who = Session & { tv: number };

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET 환경변수가 없습니다.");
  return s;
};
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function issueToken(role: Session["role"], id: string, tv: number) {
  const body = Buffer.from(JSON.stringify({ role, id, tv, exp: Date.now() + TTL[role] })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken(req: Request): Who | null {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as { role: Session["role"]; id: string; tv?: number; exp: number };
    return p.exp > Date.now() ? { role: p.role, id: p.id, tv: p.tv ?? 0 } : null;
  } catch {
    return null;
  }
}

export function findUser(s: State, who: Session) {
  if (who.role === "admin") return s.admins.find((a) => a.id === who.id);
  return (who.role === "advertiser" ? s.advertisers : s.partners).find((u) => u.id === who.id);
}

/** 토큰이 가리키는 계정이 아직 있고, 이용 가능하고, 비밀번호가 바뀌지 않았는지 */
export function stillValid(s: State, who: Who) {
  const u = findUser(s, who) as { status?: string; tv?: number } | undefined;
  if (!u || (u.tv ?? 0) !== who.tv) return false;
  return who.role === "admin" || u.status === "approved";
}
