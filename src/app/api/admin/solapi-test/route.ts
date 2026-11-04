// 알림톡 테스트 발송 (관리자만): 입력한 번호로 예시 내용의 알림톡을 1건 보낸다. 솔라피 잔액에서 건당 요금이 나간다.
// '알림톡 발송 켜기'가 꺼져 있어도 테스트는 보낼 수 있다 (켜기 전에 먼저 확인하려는 용도).
// 문의 접수·통계는 기존 솔라피 계정, 나머지 4종은 새 계정으로 보낸다.
import { loadState } from "@/lib/server/db";
import { adminFrom, audit, clientIp, forbidden, guarded, overLimit, tooMany } from "@/lib/server/ops";
import { SITE_URL } from "@/lib/site";
import { account1, account2, chargedVars, emptyVars, remainVars, sendKakao, taskVars, TEMPLATES2 } from "@/lib/server/solapi";

const TEST_LABEL: Record<string, string> = { stats: "통계", task: "관리자 확인 안내", charged: "충전 완료", remain: "잔여 수량 안내", empty: "소진 안내" };

export const POST = guarded("알림톡 테스트", async (req) => {
  const admin = await adminFrom(req);
  if (!admin) return forbidden();
  if (await overLimit(`solapi-test:${admin.id}`, 5, 600)) return tooMany(10);
  const { to, which } = (await req.json().catch(() => ({}))) as { to?: string; which?: string };
  if (typeof to !== "string" || to.replace(/\D/g, "").length < 10) return Response.json({ error: "받을 휴대폰 번호를 입력해 주세요." }, { status: 400 });
  const { data } = await loadState();
  const cfg = data.settings.solapi;
  const host = SITE_URL.replace(/^https?:\/\//, "");
  const acc1 = account1(cfg);
  const acc2 = account2(cfg);
  const r =
    which === "task"
      ? await sendKakao(acc2, to, TEMPLATES2.task, taskVars("deposit", "테스트"))
      : which === "remain"
      ? await sendKakao(acc2, to, TEMPLATES2.remain, remainVars("테스트", "신차 장기렌트"))
      : which === "empty"
      ? await sendKakao(acc2, to, TEMPLATES2.empty, emptyVars("테스트"))
      : which === "charged"
      ? await sendKakao(acc2, to, TEMPLATES2.charged, chargedVars("테스트", "신차 장기렌트", 440000, 440000, 44000, new Date().toISOString()))
      : which === "stats"
      ? await sendKakao(acc1, to, cfg.templateStats, {
          사이트명: "테스트", 날짜: "오늘", 구분: "신차 장기렌트", "총 개수": "3", "중복제외 개수": "2", 고객연락처: "010-0000-0000", "기타 신청내용": "- 테스트 발송입니다", url: `${host}/admin`,
        })
      : await sendKakao(acc1, to, cfg.templateInquiry, {
          사이트명: "테스트", 상담분류1: "신차 장기렌트 단독 DB", 고객명: "홍길동(테스트)", 상담분류2: "상담 신청이", 고객연락처: "010-0000-0000", 신청내용: "- 차종 : 테스트\n- 메모 : 테스트 발송입니다", url: `${host}/app`,
        });
  await audit({ actor: admin.name, role: "admin", action: "알림톡 테스트 발송", detail: `${TEST_LABEL[which ?? ""] ?? "문의 접수"} →${to.slice(0, 3)}****${to.slice(-4)} · ${r.ok ? "성공" : r.error}`, ip: clientIp(req) });
  return r.ok ? Response.json({ ok: true }) : Response.json({ error: r.error }, { status: r.skipped ? 400 : 502 });
});
