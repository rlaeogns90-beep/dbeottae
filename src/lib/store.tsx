"use client";

// 저장소: 서버(Neon Postgres)에 있는 전체 상태를 받아 쓰고, 바뀐 내용은 서버에 저장한다.
// 다른 기기·브라우저에서 바꾼 내용과 웹훅으로 들어온 DB는 몇 초마다 다시 받아와 맞춘다.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { SignupInput } from "./accounts";
import { assign, checkAdvertiser, defectDeadline, reopenAt, routeLead, uid } from "./engine";
import type { Advertiser, Assignment, DefectReason, Lead, Partner, Session, Settings, State } from "./types";

const SESSION_KEY = "dbeottae:session";
const POLL_MS = 4000;

type Result = string | null;

interface Store {
  state: State;
  session: Session | null;
  now: Date;
  /** 아이디 하나로 로그인하고, 계정 종류(광고주·영업자·관리자)에 맞는 화면으로 보낸다. */
  login: (loginId: string, password: string) => Promise<{ error: string } | { role: Session["role"] }>;
  logout: () => void;
  signupAdvertiser: (a: SignupInput) => Promise<Result>;
  createPartner: (p: Omit<Partner, "id" | "status" | "createdAt" | "code">) => Result;
  setReceiving: (advertiserId: string, on: boolean) => Result;
  requestDeposit: (advertiserId: string, amount: number, depositor: string) => Result;
  updateAssignment: (id: string, patch: Partial<Pick<Assignment, "consult" | "memo">>) => void;
  reportDefect: (assignmentId: string, reason: DefectReason, fileName?: string) => Result;
  approveMember: (kind: "advertiser" | "partner", id: string, ok: boolean) => void;
  setMemberStatus: (kind: "advertiser" | "partner", id: string, status: Advertiser["status"]) => void;
  handleDeposit: (id: string, ok: boolean) => void;
  handleDefect: (id: string, ok: boolean, rejectReason?: string) => void;
  assignWaiting: (leadId: string, advertiserId: string) => Result;
  assignWaitingToGroup: (leadId: string, groupId: string) => Result;
  simulateLead: (lead?: Partial<Lead>) => void;
  updateAdvertiser: (id: string, patch: Partial<Advertiser>) => void;
  adjustWallet: (advertiserId: string, amount: number, note: string) => void;
  createAdmin: (loginId: string, password: string, name: string) => Result;
  deleteAdmin: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addGroup: () => void;
  removeGroup: (id: string) => void;
  setGroupAdvertiser: (groupId: string, advertiserId?: string) => void;
  moveGroup: (groupId: string, dir: -1 | 1) => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const s = raw ? (JSON.parse(raw) as Session) : null;
    return s?.token ? s : null;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(() => new Date());
  const stateRef = useRef<State | null>(null);
  const revRef = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  // 저장은 한 번에 하나씩: 앞 저장이 끝난 뒤 다음 저장을 보낸다.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);

  const headers = useCallback(() => {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (sessionRef.current?.token) h.authorization = `Bearer ${sessionRef.current.token}`;
    return h;
  }, []);

  const saveSession = useCallback((s: Session | null) => {
    sessionRef.current = s;
    setSession(s);
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { headers: headers(), cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { rev: number; data: State; session: "ok" | "expired" | "none" };
      if (body.session === "expired") saveSession(null);
      if (pending.current > 0) return;
      revRef.current = body.rev;
      stateRef.current = body.data;
      setState(body.data);
    } catch {}
  }, [headers, saveSession]);

  useEffect(() => {
    sessionRef.current = readSession();
    setSession(sessionRef.current);
    refresh();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => {
      clearInterval(poll);
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const commit = useCallback(
    (fn: (s: State) => State) => {
      // 화면에는 바로 반영하고, 서버 저장이 충돌하면 최신 상태에 같은 변경을 다시 적용한다.
      const optimistic = fn(stateRef.current!);
      stateRef.current = optimistic;
      setState(optimistic);
      pending.current++;
      queue.current = queue.current.then(async () => {
        try {
          let next = optimistic;
          for (let i = 0; i < 4; i++) {
            const res = await fetch("/api/state", { method: "PUT", headers: headers(), body: JSON.stringify({ rev: revRef.current, data: next }) });
            if (res.ok) {
              revRef.current = ((await res.json()) as { rev: number }).rev;
              return;
            }
            if (res.status !== 409) {
              if (res.status === 401) saveSession(null);
              break;
            }
            const latest = (await res.json()) as { rev: number; data: State };
            revRef.current = latest.rev;
            next = fn(latest.data);
            stateRef.current = next;
            setState(next);
          }
        } catch {
        } finally {
          pending.current--;
        }
        // 저장하지 못했으면 서버 상태로 되돌린다.
        await refresh();
      });
    },
    [headers, refresh, saveSession],
  );

  const store = useMemo<Store | null>(() => {
    if (!state) return null;
    const get = () => stateRef.current!;
    // 관리자 승인 배정은 하루 한도와 수신 OFF는 넘길 수 있지만, 잔액과 같은 번호 규칙은 지킨다.
    const assignWaitingTo = (leadId: string, advertiserId: string): Result => {
      const s = get();
      const lead = s.leads.find((l) => l.id === leadId)!;
      const adv = s.advertisers.find((a) => a.id === advertiserId)!;
      const why = checkAdvertiser(s, adv, { ...lead, groupId: undefined }, new Date());
      if (why === "balance") return "이 광고주는 예치금이 부족합니다.";
      if (why === "duplicate") return "이 광고주는 같은 번호를 이미 받았습니다.";
      if (why === "status") return "승인된 광고주가 아닙니다.";
      commit((s) => assign(s, leadId, advertiserId, "admin"));
      return null;
    };
    const loginIdTaken = (loginId: string) => {
      const s = get();
      return [...s.advertisers, ...s.partners, ...s.admins].some((u) => u.loginId === loginId);
    };
    return {
      state,
      session,
      now,
      async login(loginId, password) {
        try {
          const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ loginId, password }) });
          const body = (await res.json()) as { error?: string; role: Session["role"]; id: string; token: string };
          if (!res.ok || body.error) return { error: body.error ?? "로그인하지 못했습니다." };
          saveSession({ role: body.role, id: body.id, token: body.token });
          await refresh();
          return { role: body.role };
        } catch {
          return { error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
        }
      },
      logout() {
        saveSession(null);
        refresh();
      },
      async signupAdvertiser(a) {
        try {
          const res = await fetch("/api/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(a) });
          if (res.ok) return null;
          return ((await res.json()) as { error?: string }).error ?? "가입 신청을 보내지 못했습니다.";
        } catch {
          return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        }
      },
      createPartner(p) {
        if (loginIdTaken(p.loginId)) return "이미 사용 중인 아이디입니다.";
        commit((s) => ({
          ...s,
          partners: [
            ...s.partners,
            { ...p, id: uid("pt"), code: p.loginId.toUpperCase(), status: "approved", createdAt: new Date().toISOString() },
          ],
        }));
        return null;
      },
      setReceiving(advertiserId, on) {
        const s = get();
        const adv = s.advertisers.find((a) => a.id === advertiserId)!;
        if (on) {
          const until = reopenAt(s, adv);
          if (until && until > new Date()) return "OFF 후 24시간이 지나야 다시 켤 수 있습니다.";
          const bal = s.wallet.filter((t) => t.advertiserId === advertiserId).reduce((n, t) => n + t.amount, 0);
          if (bal < s.settings.price) return "예치금이 부족합니다. 충전 후 다시 켜 주세요.";
        }
        commit((s) => ({
          ...s,
          advertisers: s.advertisers.map((a) =>
            a.id === advertiserId
              ? on
                ? { ...a, receiving: true, offAt: undefined, offBy: undefined }
                : { ...a, receiving: false, offAt: new Date().toISOString(), offBy: "self" }
              : a,
          ),
        }));
        return null;
      },
      requestDeposit(advertiserId, amount, depositor) {
        const s = get();
        if (amount < s.settings.minCharge) return `최소 충전 금액은 ${s.settings.minCharge.toLocaleString()}원입니다.`;
        commit((s) => ({
          ...s,
          deposits: [{ id: uid("dp"), advertiserId, amount, depositor, at: new Date().toISOString(), status: "pending" }, ...s.deposits],
        }));
        return null;
      },
      updateAssignment(id, patch) {
        commit((s) => ({ ...s, assignments: s.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      },
      reportDefect(assignmentId, reason, fileName) {
        const s = get();
        const a = s.assignments.find((x) => x.id === assignmentId)!;
        if (defectDeadline(s, a) < new Date()) return "수신 후 3시간이 지나 불량 처리를 신청할 수 없습니다.";
        if (s.defects.some((d) => d.assignmentId === assignmentId && d.status !== "rejected")) return "이미 신청한 DB입니다.";
        commit((s) => ({
          ...s,
          defects: [{ id: uid("df"), assignmentId, reason, fileName: fileName || undefined, at: new Date().toISOString(), status: "pending" }, ...s.defects],
        }));
        return null;
      },
      approveMember(kind, id, ok) {
        const status = ok ? "approved" : "rejected";
        commit((s) =>
          kind === "advertiser"
            ? { ...s, advertisers: s.advertisers.map((a) => (a.id === id ? { ...a, status } : a)) }
            : { ...s, partners: s.partners.map((p) => (p.id === id ? { ...p, status } : p)) },
        );
      },
      setMemberStatus(kind, id, status) {
        commit((s) =>
          kind === "advertiser"
            ? { ...s, advertisers: s.advertisers.map((a) => (a.id === id ? { ...a, status, receiving: status === "approved" ? a.receiving : false } : a)) }
            : { ...s, partners: s.partners.map((p) => (p.id === id ? { ...p, status } : p)) },
        );
      },
      handleDeposit(id, ok) {
        commit((s) => {
          const d = s.deposits.find((x) => x.id === id)!;
          const at = new Date().toISOString();
          return {
            ...s,
            deposits: s.deposits.map((x) => (x.id === id ? { ...x, status: ok ? "approved" : "rejected", handledAt: at } : x)),
            wallet: ok
              ? [{ id: uid("tx"), advertiserId: d.advertiserId, type: "charge", amount: d.amount, at, note: "예치금 충전" }, ...s.wallet]
              : s.wallet,
          };
        });
      },
      handleDefect(id, ok, rejectReason) {
        commit((s) => {
          const d = s.defects.find((x) => x.id === id)!;
          const a = s.assignments.find((x) => x.id === d.assignmentId)!;
          const lead = s.leads.find((l) => l.id === a.leadId)!;
          const at = new Date().toISOString();
          return {
            ...s,
            defects: s.defects.map((x) => (x.id === id ? { ...x, status: ok ? "approved" : "rejected", rejectReason, handledAt: at } : x)),
            leads: ok ? s.leads.map((l) => (l.id === lead.id ? { ...l, status: "defect" } : l)) : s.leads,
            wallet: ok
              ? [{ id: uid("tx"), advertiserId: a.advertiserId, type: "refund", amount: a.amount, at, note: `불량 환원 · ${lead.name} (${d.reason})` }, ...s.wallet]
              : s.wallet,
          };
        });
      },
      assignWaiting: assignWaitingTo,
      assignWaitingToGroup(leadId, groupId) {
        const g = get().groups.find((x) => x.id === groupId);
        if (!g?.advertiserId) return "광고주가 들어 있지 않은 그룹입니다.";
        return assignWaitingTo(leadId, g.advertiserId);
      },
      simulateLead(partial) {
        const names = ["김도현", "이수아", "박시우", "최예린", "정우진", "강하린", "조민재", "윤채원"];
        const cars = ["현대 그랜저", "기아 K8", "제네시스 G80", "기아 스포티지", "현대 팰리세이드", "기아 EV9", "BMW X3"];
        const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
        const n = () => String(Math.floor(1000 + Math.random() * 9000));
        const car = partial?.car ?? pick(cars);
        const lead: Lead = {
          id: uid("ld"),
          name: pick(names),
          phone: `010-${n()}-${n()}`,
          car,
          brand: car.split(" ")[0],
          memo: pick(["", "48개월 무보증 희망", "법인 명의 문의", "빠른 출고 원함"]) || undefined,
          site: pick(["메타", "인스타그램", "페이스북"]),
          pageName: pick(["장기렌트 특가", "신차 즉시출고", "전기차 장기렌트"]),
          term: pick(["그랜저_특가_01", "즉시출고_영상_02", "EV_혜택_03"]),
          createdAt: new Date().toISOString(),
          status: "waiting",
          ...partial,
        };
        commit((s) => routeLead(s, lead));
      },
      updateAdvertiser(id, patch) {
        commit((s) => ({ ...s, advertisers: s.advertisers.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      },
      adjustWallet(advertiserId, amount, note) {
        commit((s) => ({
          ...s,
          wallet: [{ id: uid("tx"), advertiserId, type: "adjust", amount, at: new Date().toISOString(), note: `관리자 조정 · ${note}` }, ...s.wallet],
        }));
      },
      createAdmin(loginId, password, name) {
        if (loginIdTaken(loginId)) return "이미 사용 중인 아이디입니다.";
        commit((s) => ({
          ...s,
          admins: [...s.admins, { id: uid("ad"), loginId, password, name, master: false, createdAt: new Date().toISOString() }],
        }));
        return null;
      },
      deleteAdmin(id) {
        commit((s) => ({ ...s, admins: s.admins.filter((a) => a.id !== id || a.master) }));
      },
      updateSettings(patch) {
        commit((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
      },
      addGroup() {
        commit((s) => ({ ...s, groups: [...s.groups, { id: uid("g") }] }));
      },
      removeGroup(id) {
        commit((s) => ({ ...s, groups: s.groups.filter((g) => g.id !== id) }));
      },
      setGroupAdvertiser(groupId, advertiserId) {
        // 한 광고주는 그룹 하나에만: 다른 그룹에 있던 자리는 비운다.
        commit((s) => ({
          ...s,
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, advertiserId } : g.advertiserId === advertiserId ? { ...g, advertiserId: undefined } : g,
          ),
        }));
      },
      moveGroup(groupId, dir) {
        commit((s) => {
          const i = s.groups.findIndex((g) => g.id === groupId);
          const j = i + dir;
          if (j < 0 || j >= s.groups.length) return s;
          const groups = [...s.groups];
          [groups[i], groups[j]] = [groups[j], groups[i]];
          return { ...s, groups };
        });
      },
      resetDemo() {
        fetch("/api/reset", { method: "POST", headers: headers() }).then(() => refresh());
      },
    };
  }, [state, session, now, commit, headers, refresh, saveSession]);

  if (!store) return <div className="min-h-screen bg-white" />;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider 밖에서 useStore를 썼습니다.");
  return s;
}
