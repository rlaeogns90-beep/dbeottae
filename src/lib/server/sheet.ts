// 구글 시트 백업: 접수된 DB를 날짜 / 유입(매체) / 광고주명(배정) / 이름 / 연락처 / 접수번호 로 한 줄씩 남긴다.
// 시트 쪽 Apps Script(docs/google-sheet-backup.gs)가 접수번호로 찾아 있으면 고치고 없으면 추가한다.
// SHEET_WEBHOOK_URL / SHEET_SECRET 이 없으면 아무것도 하지 않는다.
import "server-only";
import type { State } from "../types";
import { alert } from "./ops";

export interface SheetRow {
  id: string;
  at: string;
  site: string;
  advertiser: string;
  name: string;
  phone: string;
}

/** 시트에 적을 한 줄 (배정 안 된 DB는 대기 사유를 적는다) */
export function sheetRow(s: State, leadId: string): SheetRow | null {
  const lead = s.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  const asg = s.assignments.find((a) => a.leadId === lead.id);
  const adv = asg && s.advertisers.find((a) => a.id === asg.advertiserId);
  const advertiser = adv
    ? adv.company ? `${adv.name} (${adv.company})` : adv.name
    : lead.status === "defect" ? "불량 처리" : `미배정${lead.waitReason ? ` - ${lead.waitReason}` : ""}`;
  return { id: lead.id, at: lead.createdAt, site: lead.site, advertiser, name: lead.name, phone: lead.phone };
}

export const sheetEnabled = () => !!process.env.SHEET_WEBHOOK_URL && !!process.env.SHEET_SECRET;

/** 줄들을 시트로 보낸다. 실패하면 관리자 알림을 남기고 false. (접수 자체에는 영향을 주지 않는다) */
export async function pushToSheet(rows: SheetRow[]): Promise<boolean> {
  if (!sheetEnabled() || !rows.length) return true;
  try {
    for (let i = 0; i < rows.length; i += 200) {
      const res = await fetch(process.env.SHEET_WEBHOOK_URL!, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ secret: process.env.SHEET_SECRET, rows: rows.slice(i, i + 200) }),
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
      const out = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !out?.ok) throw new Error(out?.error ?? `응답 ${res.status}`);
    }
    return true;
  } catch (e) {
    await alert("warn", "구글시트", `시트 백업에 실패했습니다: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

/** 최근 며칠 치 DB를 시트와 맞춘다 (재배정·불량 처리 같은 변경도 반영). */
export function recentSheetRows(s: State, days: number): SheetRow[] {
  const since = Date.now() - days * 86_400_000;
  return s.leads
    .filter((l) => new Date(l.createdAt).getTime() >= since)
    .map((l) => sheetRow(s, l.id))
    .filter((r): r is SheetRow => !!r)
    .sort((a, b) => a.at.localeCompare(b.at));
}
