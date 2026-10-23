// 로그인·가입 규칙. 서버 API에서 쓰는 순수 함수들.
import { uid } from "./engine";
import type { Advertiser, Session, State } from "./types";

export type SignupInput = Omit<Advertiser, "id" | "status" | "receiving" | "createdAt">;

export const loginIdTaken = (s: State, loginId: string) =>
  [...s.advertisers, ...s.partners, ...s.admins].some((u) => u.loginId === loginId);

/** 아이디 하나로 세 종류 계정을 모두 찾는다. */
export function checkLogin(s: State, loginId: string, password: string): { error: string } | Session {
  const found =
    ([
      ["advertiser", s.advertisers],
      ["partner", s.partners],
      ["admin", s.admins],
    ] as const)
      .map(([role, list]) => ({ role, user: (list as { id: string; loginId: string; password: string; status?: string }[]).find((u) => u.loginId === loginId) }))
      .find((x) => x.user) ?? null;
  if (!found?.user || found.user.password !== password) return { error: "아이디 또는 비밀번호가 맞지 않습니다." };
  const status = found.user.status;
  if (status === "pending") return { error: "가입 승인 대기 중입니다. 관리자가 승인하면 로그인할 수 있습니다." };
  if (status && status !== "approved") return { error: "이용이 제한된 계정입니다. 1600-7628로 문의해 주세요." };
  return { role: found.role, id: found.user.id };
}

export function signup(s: State, a: SignupInput): { error: string } | { state: State } {
  if (loginIdTaken(s, a.loginId)) return { error: "이미 사용 중인 아이디입니다." };
  const referrer = a.referrer.trim().toUpperCase();
  if (!s.partners.some((p) => p.code === referrer && p.status === "approved"))
    return { error: "등록되지 않은 추천인 아이디입니다. 담당 영업자에게 확인해 주세요." };
  return {
    state: {
      ...s,
      advertisers: [
        ...s.advertisers,
        { ...a, referrer, id: uid("adv"), status: "pending", receiving: false, createdAt: new Date().toISOString() },
      ],
    },
  };
}
