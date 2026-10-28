// 고객센터 게시판. 광고주는 문의를 쓰고 본인 글과 답변만 보며,
// 관리자만 모든 글을 보고 답변·삭제한다. 광고주끼리는 서로의 글을 볼 수 없다.
import { crossSite, findUser, readToken, stillValid } from "@/lib/server/auth";
import { ensureTable, loadState, sql } from "@/lib/server/db";
import { alert, audit, clientIp, guarded, overLimit, tooMany } from "@/lib/server/ops";

export const dynamic = "force-dynamic";

interface Row {
  id: number; at: string; kind: string; advertiser_id: string | null; title: string; body: string;
  reply: string | null; reply_at: string | null;
}
const out = (r: Row) => ({ id: r.id, at: r.at, kind: r.kind, title: r.title, body: r.body, reply: r.reply, replyAt: r.reply_at });

async function who(req: Request) {
  const t = readToken(req);
  if (!t) return null;
  const { data } = await loadState();
  return stillValid(data, t) ? { who: t, data } : null;
}

export const GET = guarded("고객센터", async (req) => {
  const me = await who(req);
  if (!me) return Response.json({ error: "다시 로그인해 주세요." }, { status: 401 });
  await ensureTable();
  if (me.who.role === "admin") {
    const rows = (await sql`select id::int as id, at, kind, advertiser_id, title, body, reply, reply_at from support_posts where kind = 'inquiry' order by id desc limit 300`) as Row[];
    const names = new Map(me.data.advertisers.map((a) => [a.id, a]));
    return Response.json({
      rows: rows.map((r) => {
        const a = r.advertiser_id ? names.get(r.advertiser_id) : undefined;
        return { ...out(r), author: a ? { name: a.name, company: a.company ?? "", phone: a.phone } : { name: "(삭제된 광고주)", company: "", phone: "" } };
      }),
    });
  }
  if (me.who.role !== "advertiser") return Response.json({ error: "권한이 없습니다." }, { status: 403 });
  const rows = (await sql`select id::int as id, at, kind, advertiser_id, title, body, reply, reply_at from support_posts where advertiser_id = ${me.who.id} and kind = 'inquiry' order by id desc limit 100`) as Row[];
  return Response.json({ rows: rows.map(out) });
});

type Body =
  | { op: "write"; kind: "inquiry"; title: string; body: string }
  | { op: "reply"; id: number; reply: string }
  | { op: "delete"; id: number };

export const POST = guarded("고객센터", async (req) => {
  if (crossSite(req)) return Response.json({ error: "잘못된 요청입니다." }, { status: 403 });
  const me = await who(req);
  if (!me) return Response.json({ error: "다시 로그인해 주세요." }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b || typeof b !== "object") return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  await ensureTable();

  if (b.op === "write") {
    if (me.who.role !== "advertiser") return Response.json({ error: "권한이 없습니다." }, { status: 403 });
    const title = typeof b.title === "string" ? b.title.trim() : "";
    const body = typeof b.body === "string" ? b.body.trim() : "";
    if (!title || !body) return Response.json({ error: "제목과 내용을 입력해 주세요." }, { status: 400 });
    if (title.length > 100 || body.length > 3000) return Response.json({ error: "제목은 100자, 내용은 3,000자까지 쓸 수 있습니다." }, { status: 400 });
    if (b.kind === "inquiry") {
      if (await overLimit(`support:${me.who.id}`, 10, 3600)) return tooMany(60);
      await sql`insert into support_posts (kind, advertiser_id, title, body) values ('inquiry', ${me.who.id}, ${title}, ${body})`;
      const name = (findUser(me.data, me.who) as { name: string }).name;
      await alert("info", "고객센터", `${name} 광고주의 새 문의가 등록됐습니다: ${title.slice(0, 40)}`);
    } else return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
    return Response.json({ ok: true });
  }

  if (me.who.role !== "admin") return Response.json({ error: "권한이 없습니다." }, { status: 403 });
  const admin = findUser(me.data, me.who) as { name: string };
  if (!Number.isInteger(b.id)) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  if (b.op === "reply") {
    const reply = typeof b.reply === "string" ? b.reply.trim() : "";
    if (!reply || reply.length > 3000) return Response.json({ error: "답변은 1~3,000자로 써 주세요." }, { status: 400 });
    const r = (await sql`update support_posts set reply = ${reply}, reply_at = now(), replied_by = ${admin.name} where id = ${b.id} and kind = 'inquiry' returning id`) as unknown[];
    if (!r.length) return Response.json({ error: "답변할 수 있는 문의가 아닙니다." }, { status: 400 });
    await audit({ actor: admin.name, role: "admin", action: "고객센터 답변", detail: `문의 #${b.id}`, ip: clientIp(req) });
    return Response.json({ ok: true });
  }
  if (b.op === "delete") {
    await sql`delete from support_posts where id = ${b.id}`;
    await audit({ actor: admin.name, role: "admin", action: "고객센터 글 삭제", detail: `#${b.id}`, ip: clientIp(req) });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
});
