// 고객센터 전화·카카오톡 버튼과 사이트 하단 사업자 정보
import { Phone } from "lucide-react";
import { cx, Logo } from "./ui";

export const COMPANY = {
  name: "마케팅을다루다",
  tel: "1600-7628",
  ceo: "김대훈",
  bizNo: "618-44-01013",
  address: "인천광역시 연수구 하모니로 158, D동 3층 17호(송도동, 송도타임스페이스)",
  kakaoChannel: "마케팅을다루다",
  kakaoUrl: "https://pf.kakao.com/_QxnAjG",
};

export function KakaoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
      <path fill="#191919" d="M12 3.5c-5.2 0-9.4 3.3-9.4 7.4 0 2.6 1.7 4.9 4.3 6.2l-1 3.7c-.1.3.3.6.6.4l4.3-2.9c.4 0 .8.1 1.2.1 5.2 0 9.4-3.3 9.4-7.4S17.2 3.5 12 3.5z" />
    </svg>
  );
}

export function CallButton({ solid, className }: { solid?: boolean; className?: string }) {
  return (
    <a
      href={`tel:${COMPANY.tel.replace(/-/g, "")}`}
      aria-label={`고객센터 ${COMPANY.tel} 전화 걸기`}
      className={cx(
        "inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-bold",
        solid ? "bg-brand text-white hover:bg-brand-dark" : "border border-[#d1d6db] bg-white text-ink hover:bg-soft",
        className,
      )}
    >
      <Phone size={15} className={solid ? "text-white" : "text-brand"} strokeWidth={2.4} />
      {solid ? "전화하기" : COMPANY.tel}
    </a>
  );
}

export function KakaoButton({ label = "카카오톡 상담", className }: { label?: string; className?: string }) {
  return (
    <a
      href={COMPANY.kakaoUrl}
      target={COMPANY.kakaoUrl === "#" ? undefined : "_blank"}
      rel="noreferrer"
      className={cx("inline-flex h-10 items-center gap-2 rounded-lg bg-[#FEE500] px-3.5 text-sm font-bold text-black/85 hover:brightness-95", className)}
    >
      <KakaoIcon />
      {label}
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8 px-4 py-10 sm:px-6">
        <div className="space-y-3">
          <Logo size={20} />
          <p className="text-xs font-bold tracking-[0.08em] text-mute">COMPANY INFO</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px] text-sub">
            <dt className="font-semibold text-ink">상호</dt>
            <dd>{COMPANY.name}</dd>
            <dt className="font-semibold text-ink">TEL.</dt>
            <dd className="tabular">{COMPANY.tel}</dd>
            <dt className="font-semibold text-ink">대표.</dt>
            <dd>{COMPANY.ceo}</dd>
            <dt className="font-semibold text-ink">사업자번호.</dt>
            <dd className="tabular">{COMPANY.bizNo}</dd>
            <dt className="font-semibold text-ink">주소.</dt>
            <dd>{COMPANY.address}</dd>
          </dl>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-sub">
            고객센터 <b className="tabular text-base text-ink">{COMPANY.tel}</b>
          </p>
          <div className="flex flex-wrap gap-2">
            <CallButton solid className="h-11" />
            <KakaoButton label={`카카오톡 채널 ${COMPANY.kakaoChannel}`} className="h-11" />
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-mute sm:px-6">© {COMPANY.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
