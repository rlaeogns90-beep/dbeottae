// 광고주 사업자등록증 파일.
//  GET  (관리자·본인 광고주)  ?advertiser=광고주ID  사진은 바로 보이고 PDF는 내려받는다
//  POST (관리자)            가입 때 못 받은 파일을 대신 올리거나 바꾼다 (PDF·PNG·JPG, 4MB까지)
import { readToken, stillValid } from "@/lib/server/auth";
import { ensureTable, loadState, mutate, sql } from "@/lib/server/db";
import { adminFrom, audit, clientIp, forbidden, guarded, overLimit, tooMany } from "@/lib/server/ops";
import { fileResponse, readUpload } from "@/lib/server/upload";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export const GET = guarded("사업자등록증 보기", async (req) => {
  const id = new URL(req.url).searchParams.get("advertiser") ?? "";
  const who = readToken(req);
  const { data } = await loadState();
  if (!who || !stillValid(data, who)) return bad("다시 로그인해 주세요.", 401);
  if (!(who.role === "admin" || (who.role === "advertiser" && who.id === id))) return bad("파일을 찾을 수 없습니다.", 404);
  if (await overLimit(`biz-down:${who.id}`, 60, 60)) return tooMany(1);
  await ensureTable();
  const rows = (await sql`select name, mime, encode(data, 'base64') as b64 from biz_files where advertiser_id = ${id}`) as { name: string; mime: string; b64: string }[];
  if (!rows[0]) return bad("등록된 사업자등록증 파일이 없습니다.", 404);
  return fileResponse(rows[0], true);
});

export const POST = guarded("사업자등록증 첨부", async (req) => {
  const admin = await adminFrom(req);
  if (!admin) return forbidden();
  if (await overLimit(`biz-up:${admin.id}`, 30, 60)) return tooMany(1);
  const form = await req.formData().catch(() => null);
  const id = String(form?.get("advertiser") ?? "");
  const file = form?.get("file");
  if (!id || !(file instanceof File)) return bad("광고주와 파일을 선택해 주세요.");
  const up = await readUpload(file, "사업자등록증");
  if (typeof up === "string") return bad(up);

  const { data } = await loadState();
  const adv = data.advertisers.find((a) => a.id === id);
  if (!adv) return bad("광고주를 찾을 수 없습니다.");

  await ensureTable();
  await sql`insert into biz_files (advertiser_id, name, mime, size, data, at)
    values (${id}, ${up.name}, ${up.mime}, ${up.size}, decode(${up.b64}, 'base64'), now())
    on conflict (advertiser_id) do update set name = excluded.name, mime = excluded.mime, size = excluded.size, data = excluded.data, at = now()`;
  const meta = { size: up.size, at: new Date().toISOString() };
  await mutate((s) => ({
    state: {
      ...s,
      advertisers: s.advertisers.map((a) =>
        a.id === id ? { ...a, tax: { bizFileName: up.name, email: a.tax?.email ?? "", file: meta } } : a,
      ),
    },
    result: null,
  }));
  await audit({ actor: admin.name, role: "admin", action: "사업자등록증 첨부", detail: `${adv.name} · ${up.name}`, ip: clientIp(req) });
  return Response.json({ ok: true });
});
