// 서버 저장소: Neon Postgres의 app_state 한 줄에 전체 상태(JSON)를 두고,
// rev(버전 번호)가 맞을 때만 덮어써서 동시에 저장해도 서로 지우지 않게 한다.
import "server-only";
import { neon } from "@neondatabase/serverless";
import { seed } from "../seed";
import type { State } from "../types";

const sql = neon(process.env.DATABASE_URL!);

let ready: Promise<unknown> | null = null;
const ensureTable = () =>
  (ready ??= sql`create table if not exists app_state (
    id int primary key,
    rev int not null,
    data jsonb not null,
    updated_at timestamptz not null default now()
  )`);

const randomKey = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

/** 예시 데이터로 새로 시작할 때 연결 키는 저장소에 공개된 값 대신 새로 만든다. */
export function freshSeed(): State {
  const s = seed();
  return {
    ...s,
    settings: {
      ...s.settings,
      connections: s.settings.connections.map((c) => ({ ...c, key: randomKey(c.type === "landing" ? "lk" : "ak") })),
    },
  };
}

export async function loadState(): Promise<{ rev: number; data: State }> {
  await ensureTable();
  const rows = (await sql`select rev, data from app_state where id = 1`) as { rev: number; data: State }[];
  if (rows[0]) return rows[0];
  await sql`insert into app_state (id, rev, data) values (1, 1, ${JSON.stringify(freshSeed())}::jsonb) on conflict (id) do nothing`;
  return loadState();
}

/** rev가 그대로일 때만 저장하고 새 rev를 돌려준다. 그사이 다른 저장이 있었으면 null. */
export async function saveState(rev: number, data: State): Promise<number | null> {
  await ensureTable();
  const rows = (await sql`
    update app_state set data = ${JSON.stringify(data)}::jsonb, rev = rev + 1, updated_at = now()
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
