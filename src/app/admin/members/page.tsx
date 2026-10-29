"use client";

import { BizFileButton } from "@/components/biz-file";
import { Button, Card, Empty, PageHeader } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function MembersPage() {
  const { state, approveMember } = useStore();
  const ads = state.advertisers.filter((a) => a.status === "pending");

  return (
    <div>
      <PageHeader title="가입 승인" desc="광고주는 승인해야 로그인할 수 있습니다. 영업자·관리자 계정은 마스터 계정의 계정 관리에서 만듭니다." />

      {ads.length === 0 ? (
        <Card><Empty title="승인 대기 중인 광고주가 없습니다" /></Card>
      ) : (
        <div className="space-y-3">
          {ads.map((a) => {
            const referrer = state.partners.find((p) => p.code === a.referrer);
            const rows: [string, string][] = [
              ["아이디", a.loginId],
              ["DB 수신 번호", a.phone],
              ["업종", a.industry ?? "-"],
              ["회사명", a.company ?? "-"],
              ["추천인", `${a.referrer}${referrer ? ` (${referrer.name})` : " · 등록되지 않은 코드"}`],
              ...(a.receiptType === "tax"
                ? ([["증빙", "세금계산서"], ["계산서 이메일", a.tax?.email ?? "-"]] as [string, string][])
                : ([["증빙", "현금영수증"], ["현금영수증 정보", `${a.cash?.name} · ${a.cash?.phone}`]] as [string, string][])),
            ];
            return (
              <Card key={a.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold">{a.name}</p>
                    <p className="text-xs text-mute">신청 {dateTime(a.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => approveMember("advertiser", a.id, false)}>거절</Button>
                    <Button size="sm" onClick={() => approveMember("advertiser", a.id, true)}>승인</Button>
                  </div>
                </div>
                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {rows.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-line pb-2">
                      <dt className="text-sub">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                {a.receiptType === "tax" && (
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-sub">사업자등록증</span>
                    <BizFileButton adv={a} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
