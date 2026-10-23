// 브라우저로 보내기 전에 비밀번호·주민번호·연동 키를 빼고, 저장할 때는 서버에 있던 값을 되돌려 넣는다.
import "server-only";
import { maskMiddle } from "../format";
import type { Session, State } from "../types";

export function forClient(s: State, who: Session | null): State {
  if (!who) {
    // 로그인 전 메인 화면: 실시간 현황에 쓸 가린 이름과 시각만
    return {
      ...s,
      advertisers: [],
      partners: [],
      admins: [],
      assignments: [],
      wallet: [],
      deposits: [],
      defects: [],
      groups: [],
      leads: s.leads.map((l) => ({ id: l.id, name: maskMiddle(l.name), phone: "", car: "", site: "", createdAt: l.createdAt, status: l.status })),
      settings: { ...s.settings, solapi: { ...s.settings.solapi, apiKey: "" }, connections: [] },
    };
  }
  const admin = who.role === "admin";
  return {
    ...s,
    advertisers: s.advertisers.map((a) => ({ ...a, password: "", cash: a.cash && !admin ? { ...a.cash, rrn: "" } : a.cash })),
    partners: s.partners.map((p) => ({ ...p, password: "" })),
    admins: s.admins.map((a) => ({ ...a, password: "" })),
    settings: admin
      ? s.settings
      : { ...s.settings, solapi: { ...s.settings.solapi, apiKey: "" }, connections: s.settings.connections.map((c) => ({ ...c, key: "" })) },
  };
}

/** 빈 값으로 온 비밀 항목은 서버에 저장돼 있던 값으로 채운다. */
export function restoreSecrets(prev: State, next: State): State {
  const keep = <T extends { id: string; password: string }>(list: T[], old: T[]) =>
    list.map((u) => (u.password ? u : { ...u, password: old.find((o) => o.id === u.id)?.password ?? "" }));
  return {
    ...next,
    advertisers: keep(next.advertisers, prev.advertisers).map((a) => {
      const old = prev.advertisers.find((o) => o.id === a.id);
      return a.cash && !a.cash.rrn && old?.cash ? { ...a, cash: { ...a.cash, rrn: old.cash.rrn } } : a;
    }),
    partners: keep(next.partners, prev.partners),
    admins: keep(next.admins, prev.admins),
    settings: {
      ...next.settings,
      solapi: { ...next.settings.solapi, apiKey: next.settings.solapi.apiKey || prev.settings.solapi.apiKey },
      connections: next.settings.connections.map((c) =>
        c.key ? c : { ...c, key: prev.settings.connections.find((o) => o.id === c.id)?.key ?? "" },
      ),
    },
  };
}
