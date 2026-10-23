"use client";

import { Card, CardHeader, ConfirmButton, Notice, PageHeader, Toggle } from "@/components/ui";
import { won } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { state, updateSettings, resetDemo } = useStore();
  const s = state.settings;

  const Row = ({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-[13px] text-mute">{desc}</p>
      </div>
      {children}
    </div>
  );

  const Value = ({ children }: { children: React.ReactNode }) => <span className="tabular shrink-0 text-[15px] font-bold">{children}</span>;

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="배정 설정" />
      <Card>
        <CardHeader title="배정 운영" />
        <div className="divide-y divide-line">
          <Row title="전체 배정 일시정지" desc="켜면 새로 들어오는 DB가 모두 관리자 대기로 갑니다">
            <Toggle on={s.paused} onChange={(v) => updateSettings({ paused: v })} />
          </Row>
          <Row title="주말 배정 중지" desc="토·일요일에 들어온 DB는 관리자 대기로 보냅니다">
            <Toggle on={s.weekendStop} onChange={(v) => updateSettings({ weekendStop: v })} />
          </Row>
        </div>
      </Card>

      <Card>
        <CardHeader title="정책 값" desc="확정된 정책입니다. 바꾸려면 개발 단계에서 함께 조정합니다." />
        <div className="divide-y divide-line">
          <Row title="DB 단가" desc="건당 차감 금액 (VAT 포함)"><Value>{won(s.price)}</Value></Row>
          <Row title="최소 충전 금액" desc="충전한 예치금은 환불 불가"><Value>{won(s.minCharge)}</Value></Row>
          <Row title="배정 순서" desc="1번 그룹부터 차례대로, 그룹마다 광고주 1명"><Value>그룹 순번</Value></Row>
          <Row title="하루 한도" desc="광고주 1명이 하루에 받는 최대 건수, 넘으면 관리자 대기"><Value>{s.dailyLimit}건</Value></Row>
          <Row title="OFF 후 재개 대기" desc="광고주가 직접 끈 뒤 다시 켤 수 있을 때까지"><Value>{s.offLockHours}시간</Value></Row>
          <Row title="불량 신청 기한" desc="DB 배정 후 이 시간 안에만 신청 가능"><Value>{s.defectHours}시간</Value></Row>
          <Row title="영업자 수익" desc="추천 광고주의 DB 1건당, 불량 환원 건 제외"><Value>{won(s.incentivePerDb)}</Value></Row>
          <Row title="입금 계좌" desc="광고주 충전 화면에 표시"><Value>{s.bankAccount.bank} {s.bankAccount.number}</Value></Row>
        </div>
      </Card>

      <Notice tone="orange">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>프로토타입 데이터를 처음 상태로 되돌립니다. 실제 운영 버전에는 없는 기능입니다.</span>
          <ConfirmButton variant="secondary" size="sm" confirmLabel="한 번 더 누르면 초기화" onConfirm={resetDemo}>예시 데이터 초기화</ConfirmButton>
        </div>
      </Notice>
    </div>
  );
}
