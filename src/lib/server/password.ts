// 비밀번호는 scrypt로 한 방향 암호화해 "scrypt$소금$해시" 형태로만 저장한다.
import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { State } from "../types";

const PREFIX = "scrypt$";

export const isHashed = (v: string) => v.startsWith(PREFIX);

export function hashPassword(plain: string) {
  const salt = randomBytes(16).toString("base64url");
  return `${PREFIX}${salt}$${scryptSync(plain, salt, 32).toString("base64url")}`;
}

export function verifyPassword(stored: string, given: string) {
  if (!stored) return false;
  // 암호화 전 데이터(예전 저장분)는 글자 그대로 비교하고, 저장할 때 암호화된다.
  if (!isHashed(stored)) return stored === given;
  const [, salt, hash] = stored.split("$");
  const expected = Buffer.from(hash, "base64url");
  const got = scryptSync(given, salt, expected.length);
  return timingSafeEqual(expected, got);
}

/** 아직 암호화되지 않은 비밀번호를 모두 암호화한다. 바뀐 게 없으면 같은 객체를 돌려준다. */
export function hashPlainPasswords(s: State): State {
  const fix = <T extends { password: string }>(list: T[]) =>
    list.some((u) => u.password && !isHashed(u.password))
      ? list.map((u) => (u.password && !isHashed(u.password) ? { ...u, password: hashPassword(u.password) } : u))
      : list;
  const advertisers = fix(s.advertisers);
  const partners = fix(s.partners);
  const admins = fix(s.admins);
  if (advertisers === s.advertisers && partners === s.partners && admins === s.admins) return s;
  return { ...s, advertisers, partners, admins };
}
