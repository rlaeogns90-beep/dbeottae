"use client";

// 프로토타입 저장소: 브라우저 localStorage에 상태를 두고, 다른 탭과 실시간으로 맞춘다.
// 서버를 붙일 때는 이 파일의 액션들이 API 호출로 바뀐다.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { assign, checkAdvertiser, defectDeadline, reopenAt, routeLead, uid } from "./engine";
import { seed, STATE_VERSION } from "./seed";
import type { Advertiser, Assignment, DefectReason, Lead, Partner, Session, Settings, State } from "./types";

const STATE_KEY = "dbeottae:state";
const SESSION_KEY = "dbeottae:session";

type Result = string | null;

interface Store {
  state: State;
  session: Session | null;
  now: Date;
  /** 아이디 하나로 로그인하고, 계정 종류(광고주·영업자·관리자)에 맞는 화면으로 보낸다. */
  login: (loginId: string, password: string) => { error: string } | { role: Session["role"] };
  logout: () => void;
  signupAdvertiser: (a: Omit<Advertiser, "id" | "status" | "receiving" | "createdAt">) => Result;
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

function load(): State {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {}
  return seed();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(() => new Date());
  const stateRef = useRef<State | null>(null);

  useEffect(() => {
    const s = load();
    stateRef.current = s;
    setState(s);
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === STATE_KEY && e.newValue) {
        const next = JSON.parse(e.newValue) as State;
        stateRef.current = next;
        setState(next);
      }
    };
    window.addEventListener("storage", onStorage);
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(t);
    };
  }, []);

  const commit = useCallback((fn: (s: State) => State) => {
    const next = fn(stateRef.current!);
    stateRef.current = next;
    setState(next);
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const saveSession = (s: Session | null) => {
    setSession(s);
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  };

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
      login(loginId, password) {
        const s = get();
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
        saveSession({ role: found.role, id: found.user.id });
        return { role: found.role };
      },
      logout() {
        saveSession(null);
      },
      signupAdvertiser(a) {
        const s = get();
        if (loginIdTaken(a.loginId)) return "이미 사용 중인 아이디입니다.";
        if (!s.partners.some((p) => p.code === a.referrer.trim().toUpperCase() && p.status === "approved"))
          return "등록되지 않은 추천인 아이디입니다. 담당 영업자에게 확인해 주세요.";
        commit((s) => ({
          ...s,
          advertisers: [
            ...s.advertisers,
            { ...a, referrer: a.referrer.trim().toUpperCase(), id: uid("adv"), status: "pending", receiving: false, createdAt: new Date().toISOString() },
          ],
        }));
        return null;
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
          months: pick([36, 48, 60]),
          region: pick(["서울 마포구", "경기 고양시", "서울 강서구", "인천 남동구"]),
          site: pick(get().settings.connections.filter((c) => c.type === "landing")).name,
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
        commit(() => seed());
      },
    };
  }, [state, session, now, commit]);

  if (!store) return <div className="min-h-screen bg-white" />;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider 밖에서 useStore를 썼습니다.");
  return s;
}
