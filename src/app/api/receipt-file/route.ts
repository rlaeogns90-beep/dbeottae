// 세금계산서·현금영수증 첨부 파일.
//  POST   (관리자)            입금 건에 파일을 붙인다 (PDF·PNG·JPG, 4MB까지, 건당 1개이며 다시 올리면 바뀐다)
//  GET    (관리자·해당 광고주)  ?deposit=입금ID  파일을 내려받는다
//  DELETE (관리자)            ?deposit=입금ID  첨부를 지운다
import { readToken, stillValid } from "@/lib/server/auth";
import { ensureTable, loadState, mutate, sql } from "@/lib/server/db";
import { adminFrom, audit, clientIp, forbidden, guarded, overLimit, tooMany } from "@/lib/server/ops";
import { fileResponse, readUpload } from "@/lib/server/upload";
import type { State } from "@/lib/types";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => Response.json({ error }, { status });

const setFile = (s: State, id: string, file?: { name: string; size: number; at: string }): State => ({
  ...s,
  deposits: s.deposits.map((d) => (d.id === id && d.receipt ? { ...d, receipt: { ...d.receipt, file } } : d)),
});

export const POST = guarded("증빙 파일 첨부", async (req) => {
  const admin = await adminFrom(req);
  if (!admin) return forbidden();
  if (await overLimit(`receipt-up:${admin.id}`, 30, 60)) return tooMany(1);
  const form = await req.formData().catch(() => null);
  const id = String(form?.get("deposit") ?? "");
  const file = form?.get("file");
  if (!id || !(file instanceof File)) return bad("입금 건과 파일을 선택해 주세요.");
  const up = await readUpload(file, "증빙");
  if (typeof up === "string") return bad(up);
  const { name } = up;

  const { data } = await loadState();
  const dep = data.deposits.find((d) => d.id === id);
  if (!dep || dep.status !== "approved") return bad("입금이 확인된 건에만 첨부할 수 있습니다.");

  await ensureTable();
  await sql`insert into receipt_files (deposit_id, name, mime, size, data, at)
    values (${id}, ${name}, ${up.mime}, ${up.size}, decode(${up.b64}, 'base64'), now())
    on conflict (deposit_id) do update set name = excluded.name, mime = excluded.mime, size = excluded.size, data = excluded.data, at = now()`;
  await mutate((s) => ({ state: setFile(s, id, { name, size: file.size, at: new Date().toISOString() }), result: null }));
  await audit({ actor: admin.name, role: "admin", action: "증빙 파일 첨부", detail: `입금 ${id} · ${name}`, ip: clientIp(req) });
  return Response.json({ ok: true });
});

export const GET = guarded("증빙 파일 내려받기", async (req) => {
  const id = new URL(req.url).searchParams.get("deposit") ?? "";
  const who = readToken(req);
  const { data } = await loadState();
  if (!who || !stillValid(data, who)) return bad("다시 로그인해 주세요.", 401);
  const dep = data.deposits.find((d) => d.id === id);
  // 관리자이거나, 그 입금 건의 주인 광고주만 받을 수 있다.
  if (!dep || !(who.role === "admin" || (who.role === "advertiser" && dep.advertiserId === who.id))) return bad("파일을 찾을 수 없습니다.", 404);
  if (await overLimit(`receipt-down:${who.id}`, 60, 60)) return tooMany(1);
  await ensureTable();
  const rows = (await sql`select name, mime, encode(data, 'base64') as b64 from receipt_files where deposit_id = ${id}`) as { name: string; mime: string; b64: string }[];
  if (!rows[0]) return bad("첨부된 파일이 없습니다.", 404);
  return fileResponse(rows[0]);
});

export const DELETE = guarded("증빙 파일 삭제", async (req) => {
  const admin = await adminFrom(req);
  if (!admin) return forbidden();
  const id = new URL(req.url).searchParams.get("deposit") ?? "";
  await ensureTable();
  await sql`delete from receipt_files where deposit_id = ${id}`;
  await mutate((s) => ({ state: setFile(s, id, undefined), result: null }));
  await audit({ actor: admin.name, role: "admin", action: "증빙 파일 삭제", detail: `입금 ${id}`, ip: clientIp(req) });
  return Response.json({ ok: true });
});
