// 서버 저장소: Neon Postgres의 app_state 한 줄에 전체 상태(JSON)를 두고,
// rev(버전 번호)가 맞을 때만 덮어써서 동시에 저장해도 서로 지우지 않게 한다.
// 운영(VERCEL_ENV=production)은 DATABASE_URL, 그 밖(로컬·미리보기)은 시험용 DEV_DATABASE_URL만 쓴다.
import "server-only";
import { neon } from "@neondatabase/serverless";
import { seed } from "../seed";
import type { State } from "../types";
import { hashPlainPasswords } from "./password";

export const isProduction = process.env.VERCEL_ENV === "production";

const url = isProduction ? process.env.DATABASE_URL : process.env.DEV_DATABASE_URL;
if (!url) throw new Error(isProduction ? "DATABASE_URL이 없습니다." : "시험용 DEV_DATABASE_URL이 없습니다. 운영 DB에는 연결하지 않습니다.");
export const sql = neon(url);

let ready: Promise<unknown> | null = null;
/** 필요한 표를 처음 한 번 만든다: 상태, 요청 횟수, 작업 기록, 관리자 알림, 백업 */
export const ensureTable = () =>
  (ready ??= (async () => {
    await sql`create table if not exists app_state (
      id int primary key,
      rev int not null,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )`;
    await sql`create table if not exists rate_hits (key text not null, at timestamptz not null default now())`;
    await sql`create index if not exists rate_hits_key_at on rate_hits (key, at)`;
    await sql`create table if not exists audit_log (
      id bigserial primary key, at timestamptz not null default now(),
      actor text not null, role text not null, action text not null, detail text not null default '', ip text not null default ''
    )`;
    await sql`create table if not exists alerts (
      id bigserial primary key, at timestamptz not null default now(),
      level text not null, source text not null, message text not null, read_at timestamptz
    )`;
    // 세금계산서·현금영수증 첨부 파일: 입금 건(deposit_id)마다 1개. 본문은 상태(app_state)가 아니라 여기에 따로 둔다.
    await sql`create table if not exists receipt_files (
      deposit_id text primary key, name text not null, mime text not null, size int not null,
      data bytea not null, at timestamptz not null default now()
    )`;
    await sql`create table if not exists app_state_backups (
      id bigserial primary key, at timestamptz not null default now(), rev int not null, data jsonb not null
    )`;
  })().catch((e) => {
    ready = null; // 실패하면 다음 요청에서 다시 시도
    throw e;
  }));

const randomKey = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

/** 시험용 예시 데이터. 연결 키는 저장소에 공개된 값 대신 새로 만든다. */
export function freshSeed(): State {
  const s = seed();
  return hashPlainPasswords({
    ...s,
    settings: {
      ...s.settings,
      connections: s.settings.connections.map((c) => ({ ...c, key: randomKey(c.type === "landing" ? "lk" : "ak") })),
    },
  });
}

/** 운영 시작용 빈 상태: 마스터 계정 1개와 제피어 웹훅 연결만 */
export function emptyState(masterLoginId: string, masterPassword: string): State {
  const s = seed();
  return hashPlainPasswords({
    ...s,
    advertisers: [],
    partners: [],
    admins: [{ id: "ad1", loginId: masterLoginId, password: masterPassword, name: "마스터", master: true, createdAt: new Date().toISOString() }],
    leads: [],
    assignments: [],
    wallet: [],
    deposits: [],
    defects: [],
    groups: [{ id: "g1" }, { id: "g2" }, { id: "g3" }],
    settings: {
      ...s.settings,
      lastGroupId: undefined,
      bankAccount: { bank: "", number: "", holder: "마케팅을다루다" },
      connections: [{ id: "cn0", name: "제피어 · 메타 잠재고객", type: "landing", key: randomKey("lk"), active: true }],
    },
  });
}

export async function loadState(): Promise<{ rev: number; data: State }> {
  await ensureTable();
  const rows = (await sql`select rev, data from app_state where id = 1`) as { rev: number; data: State }[];
  if (rows[0]) return rows[0];
  // 운영 DB는 초기화 스크립트로만 채운다 (빈 채로 열리면 아무도 로그인할 수 없어서 오류로 알린다).
  if (isProduction) throw new Error("운영 DB가 초기화되지 않았습니다.");
  await sql`insert into app_state (id, rev, data) values (1, 1, ${JSON.stringify(freshSeed())}::jsonb) on conflict (id) do nothing`;
  return loadState();
}

/** rev가 그대로일 때만 저장하고 새 rev를 돌려준다. 그사이 다른 저장이 있었으면 null. */
export async function saveState(rev: number, data: State): Promise<number | null> {
  await ensureTable();
  const rows = (await sql`
    update app_state set data = ${JSON.stringify(hashPlainPasswords(data))}::jsonb, rev = rev + 1, updated_at = now()
    where id = 1 and rev = ${rev}
    returning rev`) as { rev: number }[];
  return rows[0]?.rev ?? null;
}

/** 최신 상태에 fn을 적용해 저장한다. 충돌하면 다시 읽어서 몇 번 더 시도한다. */
export async function mutate<T>(fn: (s: State) => { state: State; result: T }): Promise<T> {
  for (let i = 0; i < 5; i++) {
    const { rev, data } = await loadState();
    const { state, result } = fn(data);
    if (state === data) return result;
    if ((await saveState(rev, state)) !== null) return result;
  }
  throw new Error("저장이 계속 충돌했습니다. 잠시 후 다시 시도해 주세요.");
}
