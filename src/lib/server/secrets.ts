// 브라우저로 보낼 데이터를 역할별로 줄인다.
// 비밀번호는 누구에게도 보내지 않고, 광고주·영업자는 자기와 관련된 데이터만 받는다.
import "server-only";
import { maskMiddle, maskName, maskPhone } from "../format";
import type { Lead, Session, Settings, State } from "../types";

/** 다른 사람의 DB: 실시간 현황에 쓸 가린 이름·시각·상태만 */
const masked = (l: Lead): Lead => ({ id: l.id, name: maskMiddle(l.name), phone: "", car: "", site: "", createdAt: l.createdAt, status: l.status });

/** 광고주·영업자·비로그인에게 보여도 되는 설정만 */
const publicSettings = (s: Settings): Settings => ({
  ...s,
  solapi: { channel: "", pfId: "", sender: "", templateInquiry: "", templateStats: "", statsPhone: "", enabled: false, statsEnabled: false },
  connections: [],
  lastGroupId: undefined,
});

const empty = { advertisers: [], partners: [], admins: [], assignments: [], wallet: [], deposits: [], defects: [], groups: [] };

/** 이번 달(한국 시간 기준) 광고주 가입 신청 수: 개인정보 없이 숫자만 */
function signupsThisMonth(s: State) {
  const kst = new Date(Date.now() + 9 * 3_600_000);
  const start = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1) - 9 * 3_600_000;
  return s.advertisers.filter((a) => new Date(a.createdAt).getTime() >= start).length;
}

export const forClient = (s: State, who: Session | null): State => ({ ...forRole(s, who), pub: { signupsMonth: signupsThisMonth(s) } });

function forRole(s: State, who: Session | null): State {
  const noPw = <T extends { password: string }>(list: T[]) => list.map((u) => ({ ...u, password: "" }));

  if (!who) return { ...s, ...empty, leads: s.leads.map(masked), settings: publicSettings(s.settings) };

  if (who.role === "admin") {
    // API Key·Secret은 화면으로 보내지 않고, 서버에 등록됐는지만 알려준다.
    const solapi = { ...s.settings.solapi, apiKey: "", keyReady: !!(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET) };
    return { ...s, advertisers: noPw(s.advertisers), partners: noPw(s.partners), admins: noPw(s.admins), settings: { ...s.settings, solapi } };
  }

  if (who.role === "advertiser") {
    const assignments = s.assignments.filter((a) => a.advertiserId === who.id);
    const mine = new Set(assignments.map((a) => a.leadId));
    const ids = new Set(assignments.map((a) => a.id));
    return {
      ...s,
      ...empty,
      advertisers: noPw(s.advertisers.filter((a) => a.id === who.id)),
      assignments,
      // 광고소재명(term)은 광고주에게 보내지 않는다. 브랜드명은 페이지명(pageName)으로 보여준다.
      leads: s.leads.map((l) => (mine.has(l.id) ? { ...l, term: undefined } : masked(l))),
      wallet: s.wallet.filter((t) => t.advertiserId === who.id),
      deposits: s.deposits.filter((d) => d.advertiserId === who.id),
      defects: s.defects.filter((d) => ids.has(d.assignmentId)),
      settings: publicSettings(s.settings),
    };
  }

  // 영업자: 본인과 추천한 광고주, 그 광고주들의 배정 실적 (고객 이름·번호는 가림)
  const me = s.partners.find((p) => p.id === who.id)!;
  const advertisers = s.advertisers
    .filter((a) => a.referrer === me.code)
    .map((a) => ({ ...a, password: "", tax: undefined, cash: undefined }));
  const advIds = new Set(advertisers.map((a) => a.id));
  const assignments = s.assignments.filter((a) => advIds.has(a.advertiserId)).map((a) => ({ ...a, memo: "" }));
  const leadIds = new Set(assignments.map((a) => a.leadId));
  const asgIds = new Set(assignments.map((a) => a.id));
  return {
    ...s,
    ...empty,
    partners: noPw([me]),
    advertisers,
    assignments,
    leads: s.leads.filter((l) => leadIds.has(l.id)).map((l) => ({ ...masked(l), name: maskName(l.name), phone: maskPhone(l.phone), car: l.car, months: l.months })),
    defects: s.defects.filter((d) => asgIds.has(d.assignmentId)),
    settings: publicSettings(s.settings),
  };
}
