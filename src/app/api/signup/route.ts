// 광고주 가입 신청. 가입 후 관리자 승인이 있어야 쓸 수 있다.
// 세금계산서를 고르면 사업자등록증 파일을 같이 받는다 (multipart: data=가입 정보 JSON, file=파일).
// 횟수 제한은 파일이 붙은 신청에만 IP당 1시간 10번으로 둔다 (DB에 파일이 쌓이는 것을 막으려고).
import { signup, type SignupInput } from "@/lib/accounts";
import { uid } from "@/lib/engine";
import { ensureTable, mutate, sql } from "@/lib/server/db";
import { clientIp, guarded, overLimit, tooMany } from "@/lib/server/ops";
import { readUpload } from "@/lib/server/upload";

const bad = (error: string) => Response.json({ error }, { status: 400 });

export const POST = guarded("가입 신청", async (req) => {
  let input: SignupInput | null = null;
  let file: File | null = null;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    try {
      input = JSON.parse(String(form?.get("data") ?? "")) as SignupInput;
    } catch {}
    const f = form?.get("file");
    if (f instanceof File) file = f;
  } else {
    input = (await req.json().catch(() => null)) as SignupInput | null;
  }
  if (!input || typeof input !== "object") return bad("잘못된 요청입니다.");
  if (input.receiptType === "tax" && !file) return bad("사업자등록증 파일을 첨부해 주세요.");

  const id = uid("adv");
  let bizFile: { size: number; at: string } | undefined;
  if (input.receiptType === "tax" && file) {
    if (await overLimit(`signup-file:${clientIp(req)}`, 10, 3600)) return tooMany(60);
    const up = await readUpload(file, "사업자등록증");
    if (typeof up === "string") return bad(up);
    await ensureTable();
    await sql`insert into biz_files (advertiser_id, name, mime, size, data, at)
      values (${id}, ${up.name}, ${up.mime}, ${up.size}, decode(${up.b64}, 'base64'), now())`;
    bizFile = { size: up.size, at: new Date().toISOString() };
    input = { ...input, tax: { bizFileName: up.name, email: input.tax?.email ?? "" } };
  }

  const error = await mutate((s) => {
    const r = signup(s, input!, { id, bizFile });
    return "error" in r ? { state: s, result: r.error } : { state: r.state, result: null };
  }).catch(async (e) => {
    if (bizFile) await sql`delete from biz_files where advertiser_id = ${id}`;
    throw e;
  });
  // 가입이 거절되면(아이디 중복 등) 방금 저장한 파일도 지운다.
  if (error && bizFile) await sql`delete from biz_files where advertiser_id = ${id}`;
  return error ? bad(error) : Response.json({ ok: true });
});
