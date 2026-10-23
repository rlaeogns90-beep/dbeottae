// 외부 웹훅 접수 (메타 잠재고객 → 제피어 → 디비어때).
// 주소: /api/webhook?key=연결키  ·  JSON 또는 폼 형식 모두 받는다.
import { routeLead, uid } from "@/lib/engine";
import { mutate } from "@/lib/server/db";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

type Outcome = { status: 200; leadId: string; assigned: boolean; waitReason?: string } | { status: 401 | 403; error: string };

/** +82 10-1234-5678, 821012345678 같은 번호를 010-1234-5678로 맞춘다. */
function normalizePhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("82")) d = `0${d.slice(2)}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return raw.trim();
}

async function readBody(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const j = (await req.json()) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v == null ? "" : String(v)]));
  }
  const form = new URLSearchParams(await req.text());
  return Object.fromEntries(form.entries());
}

export async function POST(req: Request) {
  const key = new URL(req.url).searchParams.get("key") ?? req.headers.get("x-connection-key") ?? "";
  let body: Record<string, string>;
  try {
    body = await readBody(req);
  } catch {
    return Response.json({ ok: false, error: "본문을 읽을 수 없습니다." }, { status: 400 });
  }
  const f = (k: string) => (body[k] ?? "").trim();
  const name = f("user_name");
  const phone = normalizePhone(f("user_phone"));
  if (!name || !phone) return Response.json({ ok: false, error: "user_name, user_phone은 필수입니다." }, { status: 400 });

  const result = await mutate<Outcome>((s) => {
    const conn = s.settings.connections.find((c) => c.key === key && c.type === "landing");
    if (!key || !conn) return { state: s, result: { status: 401, error: "연결 키가 맞지 않습니다." } };
    if (!conn.active) return { state: s, result: { status: 403, error: "중지된 연결입니다." } };
    const car = f("car_name");
    const lead: Lead = {
      id: uid("ld"),
      name,
      phone,
      car,
      brand: car.split(" ")[0] || undefined,
      memo: f("car_memo") || undefined,
      site: f("source") || conn.name,
      pageName: f("page_name") || undefined,
      term: f("term") || undefined,
      createdAt: new Date().toISOString(),
      status: "waiting",
    };
    const next = routeLead(s, lead);
    const saved = next.leads.find((l) => l.id === lead.id)!;
    return { state: next, result: { status: 200, leadId: lead.id, assigned: saved.status === "assigned", waitReason: saved.waitReason } };
  });

  if (result.status !== 200) return Response.json({ ok: false, error: result.error }, { status: result.status });
  return Response.json({ ok: true, leadId: result.leadId, assigned: result.assigned, waitReason: result.waitReason ?? null });
}
