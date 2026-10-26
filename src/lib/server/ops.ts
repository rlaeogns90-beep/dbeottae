// 운영 보조: 요청 횟수 제한, 작업 기록, 관리자 알림, 백업
import "server-only";
import type { State } from "../types";
import { ensureTable, loadState, saveState, sql } from "./db";

/** 요청한 쪽 IP (Vercel이 앞에 붙여 주는 헤더 기준) */
export const clientIp = (req: Request) =>
  (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim() || "unknown";

/** key로 windowSec 안에 limit번을 넘었는지. 넘지 않았으면 이번 요청을 센다. */
export async function overLimit(key: string, limit: number, windowSec: number, count = true) {
  await ensureTable();
  const rows = (await sql`select count(*)::int as n from rate_hits where key = ${key} and at > now() - make_interval(secs => ${windowSec})`) as { n: number }[];
  if (rows[0].n >= limit) return true;
  if (count) await sql`insert into rate_hits (key) values (${key})`;
  return false;
}

/** 실패 1회 기록 (로그인 실패처럼 성공은 세지 않는 경우) */
export async function countFailure(key: string) {
  await ensureTable();
  await sql`insert into rate_hits (key) values (${key})`;
}

export async function clearFailures(key: string) {
  await sql`delete from rate_hits where key = ${key}`;
}

export const tooMany = (minutes: number) =>
  Response.json({ error: `요청이 너무 많습니다. ${minutes}분 뒤에 다시 시도해 주세요.` }, { status: 429 });

// ── 작업 기록 ──
export async function audit(e: { actor: string; role: string; action: string; detail?: string; ip?: string }) {
  try {
    await ensureTable();
    await sql`insert into audit_log (actor, role, action, detail, ip) values (${e.actor}, ${e.role}, ${e.action}, ${(e.detail ?? "").slice(0, 500)}, ${e.ip ?? ""})`;
  } catch {}
}

export async function listAudit(limit = 300) {
  await ensureTable();
  return (await sql`select id::int as id, at, actor, role, action, detail, ip from audit_log order by id desc limit ${limit}`) as AuditRow[];
}

export interface AuditRow { id: number; at: string; actor: string; role: string; action: string; detail: string; ip: string }

// ── 관리자 알림 ──
export interface AlertRow { id: number; at: string; level: "error" | "warn" | "info"; source: string; message: string; read_at: string | null }

/** 관리자 화면에 띄울 알림. 같은 내용이 10분 안에 이미 있으면 새로 만들지 않는다. */
export async function alert(level: AlertRow["level"], source: string, message: string) {
  try {
    await ensureTable();
    const dup = (await sql`select 1 from alerts where source = ${source} and message = ${message} and read_at is null and at > now() - interval '10 minutes' limit 1`) as unknown[];
    if (dup.length) return;
    await sql`insert into alerts (level, source, message) values (${level}, ${source}, ${message.slice(0, 500)})`;
  } catch {}
}

export async function listAlerts(limit = 50) {
  await ensureTable();
  return (await sql`select id::int as id, at, level, source, message, read_at from alerts order by id desc limit ${limit}`) as AlertRow[];
}

export async function unreadAlerts() {
  await ensureTable();
  return (await sql`select id::int as id, at, level, source, message, read_at from alerts where read_at is null order by id desc limit 20`) as AlertRow[];
}

export async function markAlertsRead(ids: number[] | "all") {
  if (ids === "all") await sql`update alerts set read_at = now() where read_at is null`;
  else if (ids.length) await sql`update alerts set read_at = now() where id = any(${ids}) and read_at is null`;
}

/** API 처리 중 예상 못 한 오류가 나면 알림을 남기고 500을 돌려준다. */
export function guarded(source: string, handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (e) {
      await alert("error", source, `서버 오류: ${e instanceof Error ? e.message : String(e)}`);
      return Response.json({ error: "서버에서 오류가 났습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
    }
  };
}

// ── 백업 ──
const KEEP_BACKUPS = 30;

export async function createBackup() {
  const { rev, data } = await loadState();
  await sql`insert into app_state_backups (rev, data) values (${rev}, ${JSON.stringify(data)}::jsonb)`;
  await sql`delete from app_state_backups where id not in (select id from app_state_backups order by id desc limit ${KEEP_BACKUPS})`;
  // 하루 지난 요청 횟수 기록은 정리한다.
  await sql`delete from rate_hits where at < now() - interval '1 day'`;
}

export async function listBackups() {
  await ensureTable();
  return (await sql`select id::int as id, at, rev, length(data::text) as size,
      jsonb_array_length(data->'leads') as leads, jsonb_array_length(data->'advertisers') as advertisers
    from app_state_backups order by id desc`) as { id: number; at: string; rev: number; size: number; leads: number; advertisers: number }[];
}

/** 백업 시점으로 되돌린다. 되돌리기 직전 상태도 백업으로 남긴다. */
export async function restoreBackup(id: number) {
  const rows = (await sql`select data from app_state_backups where id = ${id}`) as { data: State }[];
  if (!rows[0]) return "백업을 찾을 수 없습니다.";
  await createBackup();
  const { rev } = await loadState();
  return (await saveState(rev, rows[0].data)) === null ? "다른 저장과 겹쳤습니다. 다시 시도해 주세요." : null;
}

/** 관리자 전용 API에서: 로그인한 관리자(필요하면 마스터)를 돌려주고, 아니면 null */
export async function adminFrom(req: Request, needMaster = false) {
  const { crossSite, readToken, stillValid } = await import("./auth");
  if (req.method !== "GET" && crossSite(req)) return null;
  const who = readToken(req);
  if (who?.role !== "admin") return null;
  const { data } = await loadState();
  const admin = data.admins.find((a) => a.id === who.id);
  if (!admin || !stillValid(data, who) || (needMaster && !admin.master)) return null;
  return admin;
}

export const forbidden = () => Response.json({ error: "권한이 없습니다." }, { status: 403 });
