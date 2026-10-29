// 외부 웹훅 접수 (메타 잠재고객 → 제피어 → 디비어때).
// 주소: /api/webhook?key=연결키  ·  JSON 또는 폼 형식 모두 받는다.
// 키 하나당 1분에 60건까지, 같은 연락처가 10분 안에 다시 들어오면 중복으로 보고 받지 않는다.
// 실패하면 관리자 화면에 알림을 남긴다.
import { routeLead, uid } from "@/lib/engine";
import { mutate } from "@/lib/server/db";
import { alert, clientIp, guarded, overLimit } from "@/lib/server/ops";
import { loadState } from "@/lib/server/db";
import { pushToSheet, sheetRow } from "@/lib/server/sheet";
import { notifyAssigned, notifyStats } from "@/lib/server/solapi";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

type Outcome =
  | { status: 200; leadId: string; assigned: boolean; waitReason?: string; duplicate?: boolean }
  | { status: 401 | 403; error: string };

/** +82 10-1234-5678, 821012345678 같은 번호를 010-1234-5678로 맞춘다. */
function normalizePhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("82")) d = `0${d.slice(2)}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return "";
}

async function readBody(req: Request): Promise<Record<string, string>> {
  const text = (await req.text()).slice(0, 20_000);
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const j = JSON.parse(text) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v == null ? "" : String(v)]));
  }
  return Object.fromEntries(new URLSearchParams(text).entries());
}

const fail = async (status: number, error: string, notify: string) => {
  await alert(status >= 500 ? "error" : "warn", "웹훅", `${notify} — ${error}`);
  return Response.json({ ok: false, error }, { status });
};

export const POST = guarded("웹훅", async (req) => {
  const key = (new URL(req.url).searchParams.get("key") ?? req.headers.get("x-connection-key") ?? "").slice(0, 100);
  const ip = clientIp(req);
  if (await overLimit(`webhook:${key || ip}`, 60, 60)) return fail(429, "1분에 60건을 넘었습니다.", "웹훅 요청이 너무 많이 들어와 막았습니다");

  let body: Record<string, string>;
  try {
    body = await readBody(req);
  } catch {
    return fail(400, "본문을 읽을 수 없습니다.", "웹훅 형식이 잘못된 요청이 들어왔습니다");
  }
  const f = (k: string, max: number) => (body[k] ?? "").trim().slice(0, max);
  const name = f("user_name", 50);
  const phone = normalizePhone(f("user_phone", 30));
  if (!name || !phone) return fail(400, "user_name과 올바른 user_phone이 필요합니다.", `이름 또는 연락처가 빠진 DB가 들어와 받지 않았습니다 (이름: ${name || "없음"})`);

  const result = await mutate<Outcome>((s) => {
    const conn = s.settings.connections.find((c) => c.key === key && c.type === "landing");
    if (!key || !conn) return { state: s, result: { status: 401, error: "연결 키가 맞지 않습니다." } };
    if (!conn.active) return { state: s, result: { status: 403, error: "중지된 연결입니다." } };
    const recent = s.leads.find((l) => l.phone === phone && Date.now() - new Date(l.createdAt).getTime() < 10 * 60_000);
    if (recent) return { state: s, result: { status: 200, leadId: recent.id, assigned: recent.status === "assigned", duplicate: true } };
    const car = f("car_name", 100);
    const lead: Lead = {
      id: uid("ld"),
      name,
      phone,
      car,
      brand: car.split(" ")[0] || undefined,
      memo: f("car_memo", 500) || undefined,
      site: f("source", 100) || conn.name,
      pageName: f("page_name", 100) || undefined,
      term: f("term", 100) || undefined,
      createdAt: new Date().toISOString(),
      status: "waiting",
    };
    const next = routeLead(s, lead);
    const saved = next.leads.find((l) => l.id === lead.id)!;
    return { state: next, result: { status: 200, leadId: lead.id, assigned: saved.status === "assigned", waitReason: saved.waitReason } };
  });

  if (result.status !== 200) return fail(result.status, result.error, `웹훅 접수 실패 (IP ${ip})`);
  // 새로 접수된 DB만 알림톡을 보낸다 (중복 접수는 제외). 알림이 실패해도 접수는 성공으로 돌려준다.
  if (!result.duplicate) {
    const { data } = await loadState();
    await notifyAssigned(data, result.leadId).catch(() => {});
    await notifyStats(data, result.leadId).catch(() => {});
    const row = sheetRow(data, result.leadId);
    if (row) await pushToSheet([row]);
  }
  return Response.json({ ok: true, leadId: result.leadId, assigned: result.assigned, duplicate: result.duplicate ?? false, waitReason: result.waitReason ?? null });
});
