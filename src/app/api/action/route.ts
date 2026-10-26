// 변경 작업 1건을 받아 권한·형식을 확인하고 최신 상태에 적용해 저장한다. 관리자 작업은 기록을 남긴다.
import { runAction, type Action } from "@/lib/actions";
import { crossSite, findUser, readToken, stillValid } from "@/lib/server/auth";
import { loadState, mutate } from "@/lib/server/db";
import { audit, clientIp, guarded, overLimit, tooMany } from "@/lib/server/ops";

const LABEL: Record<Action["type"], string> = {
  setReceiving: "수신 ON/OFF", requestDeposit: "충전 요청", updateAssignment: "상담 상태·메모", reportDefect: "불량 신청",
  approveMember: "가입 승인/거절", setMemberStatus: "회원 상태 변경", handleDeposit: "입금 확인", handleDefect: "불량 처리",
  assignWaiting: "대기 DB 배정", assignWaitingToGroup: "대기 DB 그룹 배정", simulateLead: "테스트 DB 접수", updateAdvertiser: "광고주 정보 수정",
  adjustWallet: "예치금 조정", updateSettings: "설정 변경", addGroup: "그룹 추가", removeGroup: "그룹 삭제", setGroupAdvertiser: "그룹 광고주 지정",
  moveGroup: "그룹 순서 변경", createPartner: "영업자 계정 생성", setPassword: "비밀번호 재설정", createAdmin: "관리자 계정 생성", deleteAdmin: "관리자 계정 삭제",
};

/** 기록에 남길 때 비밀번호·연동 키 같은 값은 어디에 있든 가린다. */
const describe = (a: Action) => {
  const { type, ...rest } = a;
  const detail = JSON.stringify(rest, (k, v) => (["password", "key", "apiKey"].includes(k) ? "(가림)" : v));
  return { type: LABEL[type] ?? type, detail: detail.slice(0, 400) };
};

export const POST = guarded("작업 저장", async (req) => {
  if (crossSite(req)) return Response.json({ error: "잘못된 요청입니다." }, { status: 403 });
  const who = readToken(req);
  if (!who) return Response.json({ error: "다시 로그인해 주세요." }, { status: 401 });
  if (await overLimit(`action:${who.id}`, 120, 60)) return tooMany(1);
  const { data } = await loadState();
  if (!stillValid(data, who)) return Response.json({ error: "다시 로그인해 주세요." }, { status: 401 });
  const action = (await req.json().catch(() => null)) as Action | null;
  if (!action || typeof action.type !== "string") return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const error = await mutate((s) => {
    if (!stillValid(s, who)) return { state: s, result: "다시 로그인해 주세요." };
    const r = runAction(s, who, action);
    return "error" in r ? { state: s, result: r.error } : { state: r.state, result: null };
  });
  if (error) return Response.json({ error }, { status: 400 });
  if (who.role === "admin") {
    const { type, detail } = describe(action);
    await audit({ actor: (findUser(data, who) as { name: string }).name, role: "admin", action: type, detail, ip: clientIp(req) });
  }
  return Response.json({ ok: true });
});
