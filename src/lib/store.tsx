"use client";

// 저장소: 서버(Neon Postgres)에 있는 상태 중 내 역할에 맞는 부분을 받아 쓴다.
// 변경은 작업(action) 단위로 서버에 보내고, 서버가 권한을 확인한 뒤 저장한다.
// 화면에는 같은 작업을 먼저 반영해 두고, 서버 결과로 다시 맞춘다.
// 다른 기기에서 바꾼 내용과 웹훅으로 들어온 DB는 몇 초마다 다시 받아온다.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { SignupInput } from "./accounts";
import { runAction, type Action } from "./actions";
import type { Advertiser, Assignment, DefectReason, Lead, MemberStatus, Partner, Session, Settings, State } from "./types";

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
  changeMyPassword: (current: string, next: string) => Promise<Result>;
  setPassword: (kind: "advertiser" | "partner" | "admin", id: string, password: string) => Result;
  createPartner: (p: Pick<Partner, "loginId" | "password" | "name" | "phone">) => Result;
  setReceiving: (advertiserId: string, on: boolean) => Result;
  requestDeposit: (advertiserId: string, amount: number, depositor: string) => Result;
  updateAssignment: (id: string, patch: Partial<Pick<Assignment, "consult" | "memo">>) => void;
  reportDefect: (assignmentId: string, reason: DefectReason, fileName?: string) => Result;
  approveMember: (kind: "advertiser" | "partner", id: string, ok: boolean) => void;
  setMemberStatus: (kind: "advertiser" | "partner", id: string, status: MemberStatus) => void;
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

const json = { "content-type": "application/json" };
const OFFLINE = "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(() => new Date());
  const stateRef = useRef<State | null>(null);
  const sessionRef = useRef<Session | null>(null);
  // 작업은 한 번에 하나씩 보낸다. 보내는 중에는 받아온 상태로 화면을 덮지 않는다.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);

  const headers = useCallback(() => {
    const h: Record<string, string> = { ...json };
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
      const body = (await res.json()) as { data: State; session: "ok" | "expired" | "none" };
      if (body.session === "expired") saveSession(null);
      if (pending.current > 0) return;
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

  /** 작업 1건: 화면에 먼저 반영하고 서버로 보낸다. 규칙에 걸리면 바로 오류 문구를 돌려준다. */
  const act = useCallback(
    (action: Action): Result => {
      const who = sessionRef.current;
      if (!who || !stateRef.current) return "다시 로그인해 주세요.";
      const local = runAction(stateRef.current, who, action);
      if ("error" in local) return local.error;
      stateRef.current = local.state;
      setState(local.state);
      pending.current++;
      queue.current = queue.current.then(async () => {
        try {
          const res = await fetch("/api/action", { method: "POST", headers: headers(), body: JSON.stringify(action) });
          if (res.status === 401) saveSession(null);
          else if (!res.ok) window.alert(((await res.json()) as { error?: string }).error ?? "저장하지 못했습니다.");
        } catch {
          window.alert(OFFLINE);
        } finally {
          pending.current--;
        }
        // 서버에 저장된 결과로 다시 맞춘다 (실패했으면 되돌아간다).
        await refresh();
      });
      return null;
    },
    [headers, refresh, saveSession],
  );

  const store = useMemo<Store | null>(() => {
    if (!state) return null;
    const run = (a: Action) => {
      act(a);
    };
    return {
      state,
      session,
      now,
      async login(loginId, password) {
        try {
          const res = await fetch("/api/login", { method: "POST", headers: json, body: JSON.stringify({ loginId, password }) });
          const body = (await res.json()) as { error?: string; role: Session["role"]; id: string; token: string };
          if (!res.ok || body.error) return { error: body.error ?? "로그인하지 못했습니다." };
          saveSession({ role: body.role, id: body.id, token: body.token });
          await refresh();
          return { role: body.role };
        } catch {
          return { error: OFFLINE };
        }
      },
      logout() {
        saveSession(null);
        refresh();
      },
      async signupAdvertiser(a) {
        try {
          const res = await fetch("/api/signup", { method: "POST", headers: json, body: JSON.stringify(a) });
          if (res.ok) return null;
          return ((await res.json()) as { error?: string }).error ?? "가입 신청을 보내지 못했습니다.";
        } catch {
          return OFFLINE;
        }
      },
      async changeMyPassword(current, next) {
        try {
          const res = await fetch("/api/password", { method: "POST", headers: headers(), body: JSON.stringify({ current, next }) });
          if (res.ok) return null;
          return ((await res.json()) as { error?: string }).error ?? "비밀번호를 바꾸지 못했습니다.";
        } catch {
          return OFFLINE;
        }
      },
      setPassword: (kind, id, password) => act({ type: "setPassword", kind, id, password }),
      createPartner: (p) => act({ type: "createPartner", ...p }),
      setReceiving: (advertiserId, on) => act({ type: "setReceiving", advertiserId, on }),
      requestDeposit: (advertiserId, amount, depositor) => act({ type: "requestDeposit", advertiserId, amount, depositor }),
      updateAssignment: (id, patch) => run({ type: "updateAssignment", id, patch }),
      reportDefect: (assignmentId, reason, fileName) => act({ type: "reportDefect", assignmentId, reason, fileName }),
      approveMember: (kind, id, ok) => run({ type: "approveMember", kind, id, ok }),
      setMemberStatus: (kind, id, status) => run({ type: "setMemberStatus", kind, id, status }),
      handleDeposit: (id, ok) => run({ type: "handleDeposit", id, ok }),
      handleDefect: (id, ok, rejectReason) => run({ type: "handleDefect", id, ok, rejectReason }),
      assignWaiting: (leadId, advertiserId) => act({ type: "assignWaiting", leadId, advertiserId }),
      assignWaitingToGroup: (leadId, groupId) => act({ type: "assignWaitingToGroup", leadId, groupId }),
      simulateLead(partial) {
        const names = ["김도현", "이수아", "박시우", "최예린", "정우진", "강하린", "조민재", "윤채원"];
        const cars = ["현대 그랜저", "기아 K8", "제네시스 G80", "기아 스포티지", "현대 팰리세이드", "기아 EV9", "BMW X3"];
        const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
        const n = () => String(Math.floor(1000 + Math.random() * 9000));
        const car = partial?.car ?? pick(cars);
        run({
          type: "simulateLead",
          lead: {
            id: "",
            name: pick(names),
            phone: `010-${n()}-${n()}`,
            car,
            brand: car.split(" ")[0],
            memo: pick(["", "48개월 무보증 희망", "법인 명의 문의", "빠른 출고 원함"]) || undefined,
            site: pick(["메타", "인스타그램", "페이스북"]),
            pageName: pick(["장기렌트 특가", "신차 즉시출고", "전기차 장기렌트"]),
            term: pick(["그랜저_특가_01", "즉시출고_영상_02", "EV_혜택_03"]),
            createdAt: "",
            status: "waiting",
            ...partial,
          },
        });
      },
      updateAdvertiser: (id, patch) => run({ type: "updateAdvertiser", id, patch }),
      adjustWallet: (advertiserId, amount, note) => run({ type: "adjustWallet", advertiserId, amount, note }),
      createAdmin: (loginId, password, name) => act({ type: "createAdmin", loginId, password, name }),
      deleteAdmin: (id) => run({ type: "deleteAdmin", id }),
      updateSettings: (patch) => run({ type: "updateSettings", patch }),
      addGroup: () => run({ type: "addGroup" }),
      removeGroup: (id) => run({ type: "removeGroup", id }),
      setGroupAdvertiser: (groupId, advertiserId) => run({ type: "setGroupAdvertiser", groupId, advertiserId }),
      moveGroup: (groupId, dir) => run({ type: "moveGroup", groupId, dir }),
      resetDemo() {
        fetch("/api/reset", { method: "POST", headers: headers() })
          .then(async (res) => {
            if (!res.ok) window.alert(((await res.json()) as { error?: string }).error ?? "초기화하지 못했습니다.");
          })
          .finally(() => refresh());
      },
    };
  }, [state, session, now, act, headers, refresh, saveSession]);

  if (!store) return <div className="min-h-screen bg-white" />;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider 밖에서 useStore를 썼습니다.");
  return s;
}
