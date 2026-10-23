"use client";

// 메인 화면 (시안 A · 투명한 거래소): 소개, 로그인, 실시간 현황, 비교, 배정 과정, 결번 환원, 자주 묻는 질문
import { Bike, Car, CarFront, Phone, Plus, RotateCcw, ShieldCheck, Ship, Umbrella, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CallButton, COMPANY, KakaoButton, KakaoIcon, SiteFooter } from "@/components/contact";
import { LiveFeed } from "@/components/live-feed";
import { Logo, Notice } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Session } from "@/lib/types";

const home: Record<Session["role"], string> = { advertiser: "/app", partner: "/partner", admin: "/admin" };

const demo: [string, string][] = [
  ["kim01", "광고주 · 수신 ON"],
  ["choi04", "광고주 · 잔액 소진"],
  ["sales01", "영업자"],
  ["master", "마스터"],
  ["support1", "관리자"],
];

const proofs = [
  { icon: ShieldCheck, title: "출처 확실", desc: "매체 사이트, 본인인증, 동의 기록까지 확인된 DB만" },
  { icon: UserRound, title: "1:1 단독", desc: "한 신청 건은 한 명에게만, 같은 번호는 다시 주지 않음" },
  { icon: RotateCcw, title: "결번 환원", desc: "받은 뒤 3시간 안 신청, 확인되면 예치금으로 환원" },
];

const compare: [string, string, string][] = [
  ["받는 사람", "여러 업체에 동시 판매", "한 명에게만 단독"],
  ["가격", "상담해야 알려줌", "건당 40,000원 공개 (VAT 별도)"],
  ["구매 단위", "수십 건 패키지 선결제", "1건씩 예치금에서 차감"],
  ["수신 조절", "정해진 물량을 그대로 받음", "원할 때 직접 수신 ON/OFF"],
  ["전달", "모아서 일괄 전달", "10초 안에 1:1 카카오 알림톡"],
  ["불량 처리", "업체마다 다른 AS 조건", "결번이면 예치금으로 모두 환원"],
];

const steps: [string, string][] = [
  ["고객이 직접 신청", "매체 사이트에서 차종, 개월수, 이름, 연락처를 입력하고 본인인증과 동의를 마칩니다."],
  ["같은 번호 확인", "그 번호를 받은 적 있는 영업사원은 배정 대상에서 뺍니다."],
  ["순번대로 배정", "수신을 켜 둔 영업사원에게 1번 그룹부터 차례대로, 한 사람당 하루 최대 3건."],
  ["10초 만에 알림톡 도착", "이름, 연락처, 차종이 카카오 알림톡으로 바로 옵니다. 사이트 DB 관리에서도 실시간으로 확인할 수 있습니다."],
];

const industries: { name: string; desc: string; icon: React.ElementType; live?: boolean }[] = [
  { name: "신차 장기렌트", desc: "신차 장기렌트·리스 견적 상담 DB", icon: CarFront, live: true },
  { name: "중고차 수출/매입", desc: "중고차 수출·매입 상담 DB", icon: Ship },
  { name: "중고차 리스", desc: "중고차 리스·할부 상담 DB", icon: Car },
  { name: "오토바이 매매", desc: "이륜차 구매·판매 상담 DB", icon: Bike },
  { name: "보험", desc: "자동차·생활 보험 상담 DB", icon: Umbrella },
];

const faqs: [string, string][] = [
  ["가격은 얼마인가요?", "신차 장기렌트 DB 기준으로 1건에 40,000원(VAT 별도)입니다. 10건분부터 충전하고, DB를 받을 때마다 1건씩 차감됩니다. 충전한 예치금은 환불되지 않습니다. 나머지 업종의 가격은 현재 협의 중이며, 업종이 열리면 안내해 드립니다."],
  ["DB는 얼마나 빨리 오나요?", "고객이 신청하면 10초 안에 카카오 알림톡으로 도착합니다. 같은 DB는 사이트의 DB 관리 화면에서도 바로 볼 수 있습니다."],
  ["원할 때만 받을 수 있나요?", "네. 수신 ON/OFF를 직접 켜고 끌 수 있습니다. 시간대 지정은 없고, 끈 뒤 24시간이 지나면 다시 켤 수 있습니다. 예치금을 다 쓰면 자동으로 꺼집니다."],
  ["다른 사람도 같은 DB를 받나요?", "아니요. 한 신청 건은 한 명에게만 보냅니다. 같은 번호가 다시 들어와도 이미 받은 분에게는 다시 보내지 않습니다."],
  ["어떤 DB가 불량으로 인정되나요?", "결번만 인정합니다. 받은 뒤 3시간 안에 사이트에서 불량 처리를 신청하면, 확인 후 예치금으로 환원됩니다. 통화 녹음은 없어도 됩니다."],
  ["어떻게 시작하나요?", "담당 영업자에게 받은 추천인 아이디로 가입 신청하세요. 관리자 승인 후 예치금을 충전하고 수신을 켜면 바로 받기 시작합니다."],
];

function PhoneMock() {
  const Card = ({ time, children, strong }: { time: string; children: React.ReactNode; strong?: boolean }) => (
    <div className={`flex flex-col gap-1.5 rounded-[18px] bg-white p-4 ${strong ? "shadow-[0_4px_12px_rgba(25,31,40,0.06)]" : ""}`}>
      <div className="flex justify-between text-xs text-[#6b7684]">
        <span className="font-bold text-ink"><span className="text-accent">DB</span>어때</span>
        <span>{time}</span>
      </div>
      {children}
    </div>
  );
  return (
    <div className="w-[300px] max-w-full rounded-[40px] bg-ink p-3 sm:w-[320px] sm:rounded-[44px] sm:p-3.5 shadow-[0_24px_60px_rgba(25,31,40,0.18)]">
      <div className="flex flex-col gap-3 rounded-[30px] sm:min-h-[500px] sm:rounded-[32px] bg-soft px-4 pt-7 pb-9">
        <span className="self-center text-xs font-bold text-[#6b7684]">알림톡 화면 예시</span>
        <Card time="방금" strong>
          <b className="text-[15px]">새 고객 DB가 도착했습니다</b>
          <span className="text-sm leading-relaxed text-[#333d4b]">김민준 고객님 · 010-****-1101<br />현대 그랜저 · 48개월</span>
          <span className="mt-1 self-start rounded-lg bg-brand-soft px-2.5 py-1.5 text-[13px] font-bold text-brand-dark">지금 전화하기</span>
        </Card>
        <Card time="오늘 09:12">
          <span className="text-sm leading-relaxed text-[#333d4b]">DB 1건 금액이 예치금에서 차감됐습니다. 남은 예치금으로 7건을 더 받을 수 있습니다.</span>
        </Card>
        <Card time="어제">
          <span className="text-sm leading-relaxed text-[#333d4b]">결번 신청이 승인되어 DB 금액이 예치금으로 돌아왔습니다.</span>
        </Card>
      </div>
    </div>
  );
}

export default function MainPage() {
  const { login } = useStore();
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (loginId = id, password = pw) => {
    const r = login(loginId, password);
    if ("error" in r) return setError(r.error);
    router.push(home[r.role]);
  };

  const scrollTo = (hash: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[68px] sm:px-6">
          <div className="flex items-center gap-9">
            <Logo size={22} />
            <nav className="hidden gap-6 text-[15px] font-medium text-sub md:flex">
              <a href="#compare" onClick={scrollTo("compare")} className="hover:text-ink">다른 점</a>
              <a href="#flow" onClick={scrollTo("flow")} className="hover:text-ink">배정 방식</a>
              <a href="#industries" onClick={scrollTo("industries")} className="hover:text-ink">업종</a>
              <a href="#faq" onClick={scrollTo("faq")} className="hover:text-ink">자주 묻는 질문</a>
            </nav>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden gap-2 sm:flex">
              <CallButton />
              <KakaoButton />
            </div>
            <a href={`tel:${COMPANY.tel.replace(/-/g, "")}`} aria-label={`고객센터 ${COMPANY.tel} 전화 걸기`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d1d6db] sm:hidden">
              <Phone size={17} className="text-brand" strokeWidth={2.4} />
            </a>
            <a href={COMPANY.kakaoUrl} aria-label="카카오톡 상담" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FEE500] sm:hidden">
              <KakaoIcon size={20} />
            </a>
            <Link href="/signup" className="inline-flex h-9 items-center rounded-lg bg-ink px-3 text-sm font-bold text-white hover:bg-[#333d4b] sm:h-10 sm:px-4">
              가입 신청
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-6xl flex-wrap items-start gap-10 px-4 pt-8 pb-14 sm:gap-14 sm:px-6 sm:pt-16 sm:pb-20">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5 sm:gap-7">
          <span className="self-start rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-bold text-brand-dark sm:text-sm">자동차 단독 DB · 건당 CPA</span>
          <h1 className="text-[32px] leading-[1.25] sm:text-[40px] font-extrabold tracking-[-0.03em] text-balance md:text-[56px]">
            경쟁 전화 없는 DB,
            <br />
            계약률 높은 <span className="text-accent">DB어때</span>
          </h1>
          <p className="max-w-[34em] text-base leading-relaxed text-sub sm:text-[19px]">
            출처 확실 · 1:1 단독 · 건당 결제. 고객이 신청하는 순간, 단 한 명의 영업사원에게만 10초 안에 카카오 알림톡으로 보냅니다.
          </p>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2 rounded-2xl border border-line px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-bold text-sub sm:text-sm">신차 장기렌트 단독 실시간 DB 1건</span>
              <span className="tabular text-[38px] leading-none sm:text-[44px] font-extrabold tracking-[-0.03em]">40,000원</span>
            </div>
            <span className="pb-1 text-sm text-[#6b7684] sm:text-[15px]">VAT 별도 · 패키지 없음 · 받은 만큼만 차감</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            <a href="#login" onClick={scrollTo("login")} className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[#d1d6db] text-[15px] font-bold">
              로그인
            </a>
            <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-[10px] bg-brand text-[15px] font-bold text-white">
              가입 신청
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-line rounded-2xl border border-line sm:flex-row sm:flex-wrap sm:gap-5 sm:divide-y-0 sm:rounded-none sm:border-0">
            {proofs.map((p) => (
              <div key={p.title} className="flex min-w-0 items-start gap-3.5 px-5 py-4 sm:flex-[1_1_160px] sm:flex-col sm:gap-2 sm:p-0">
                <p.icon size={28} className="mt-0.5 shrink-0 text-brand sm:mt-0" strokeWidth={2} />
                <div className="flex flex-col gap-1 sm:gap-2">
                  <b className="text-base sm:text-[17px]">{p.title}</b>
                  <span className="text-sm leading-relaxed text-sub">{p.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div id="login" className="flex min-w-0 flex-[1_1_400px] scroll-mt-20 flex-col gap-4 md:flex-[0_1_400px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-7 shadow-[0_12px_32px_rgba(25,31,40,0.06)]"
          >
            <b className="text-xl">로그인</b>
            <label htmlFor="login-id" className="flex flex-col gap-1.5 text-[13px] font-bold text-sub">
              아이디
              <input id="login-id" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" className="h-12 rounded-[10px] border border-[#d1d6db] px-3.5 text-base font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
            </label>
            <label htmlFor="login-pw" className="flex flex-col gap-1.5 text-[13px] font-bold text-sub">
              비밀번호
              <input id="login-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" className="h-12 rounded-[10px] border border-[#d1d6db] px-3.5 text-base font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
            </label>
            {error && <p className="text-[13px] text-bad">{error}</p>}
            <button type="submit" className="h-[52px] rounded-[10px] bg-brand text-base font-bold text-white hover:bg-brand-dark">로그인</button>
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7684]">처음 오셨나요?</span>
              <Link href="/signup" className="font-bold text-brand">광고주 가입 신청</Link>
            </div>
          </form>

          <LiveFeed />

          <Notice>
            <p className="mb-2 font-semibold text-ink">프로토타입 체험 계정 (비밀번호 1234)</p>
            <div className="flex flex-wrap gap-1.5">
              {demo.map(([loginId, label]) => (
                <button key={loginId} onClick={() => submit(loginId, "1234")} className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-sub hover:border-brand hover:text-brand">
                  {label}
                </button>
              ))}
            </div>
          </Notice>
        </div>
      </section>

      <section id="compare" className="scroll-mt-20 bg-page px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em] sm:text-4xl">흔한 CPA 플랫폼과 무엇이 다른가요?</h2>
            <p className="text-base text-sub sm:text-[17px]">가격을 숨기지 않고, 받는 사람을 늘리지 않고, 받을지 말지는 직접 정합니다.</p>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {compare.map(([k, other, ours]) => (
              <div key={k} className="rounded-2xl border border-line bg-white p-5">
                <b className="text-[15px]">{k}</b>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <div className="flex gap-3 px-3">
                    <span className="w-14 shrink-0 font-semibold text-[#6b7684]">흔한 CPA</span>
                    <span className="text-sub">{other}</span>
                  </div>
                  <div className="flex gap-3 rounded-lg bg-brand-soft px-3 py-2.5">
                    <span className="w-14 shrink-0 font-extrabold text-brand-dark">DB어때</span>
                    <span className="font-bold text-ink">{ours}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-white md:block">
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="text-left">
                  <th className="w-[20%] border-b border-line px-6 py-4 text-sm font-bold text-[#6b7684]">항목</th>
                  <th className="w-[38%] border-b border-line px-6 py-4 text-sm font-bold text-[#6b7684]">흔한 CPA 플랫폼</th>
                  <th className="w-[42%] border-b border-line bg-brand-soft px-6 py-4 text-sm font-extrabold text-brand-dark">DB어때</th>
                </tr>
              </thead>
              <tbody>
                {compare.map(([k, other, ours], i) => (
                  <tr key={k}>
                    <td className={`px-6 py-4 font-bold ${i < compare.length - 1 ? "border-b border-soft" : ""}`}>{k}</td>
                    <td className={`px-6 py-4 text-sub ${i < compare.length - 1 ? "border-b border-soft" : ""}`}>{other}</td>
                    <td className={`bg-[#f7f9fe] px-6 py-4 font-bold ${i < compare.length - 1 ? "border-b border-soft" : ""}`}>{ours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="flow" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-10 sm:gap-14">
          <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-6 sm:gap-7">
            <div className="flex flex-col gap-3">
              <h2 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em] sm:text-4xl">DB 한 건이 도착하기까지</h2>
              <p className="text-base text-sub sm:text-[17px]">고객이 신청 버튼을 누르고 <b className="text-ink">단 10초</b>면 내 휴대폰에 도착합니다.</p>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {steps.map(([title, desc], i) => (
                <div key={title} className={`flex min-w-0 flex-[1_1_240px] flex-col gap-2 rounded-2xl border p-5 sm:gap-2.5 sm:p-6 ${i === steps.length - 1 ? "border-brand bg-[#f7f9fe]" : "border-line"}`}>
                  <span className="tabular text-sm font-extrabold text-brand">{i + 1}</span>
                  <b className="text-base sm:text-lg">{title}</b>
                  <span className="text-sm leading-relaxed text-sub">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-[0_1_360px] justify-center">
            <PhoneMock />
          </div>
        </div>
      </section>

      <section id="industries" className="scroll-mt-24 px-4 pb-14 sm:px-6 sm:pb-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-3">
              <h2 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em] sm:text-4xl">DB 구매 가능한 업종</h2>
              <p className="text-base text-sub sm:text-[17px]">신차 장기렌트부터 시작해, 같은 방식으로 업종을 계속 늘려가고 있습니다.</p>
            </div>
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span className="flex items-center gap-1.5 text-ok"><span className="h-2 w-2 rounded-full bg-ok" />진행 중 1</span>
              <span className="flex items-center gap-1.5 text-[#6b7684]"><span className="h-2 w-2 rounded-full bg-[#c4cad0]" />준비 중 {industries.length - 1}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {industries.map((it) =>
              it.live ? (
                <div key={it.name} className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border-2 border-brand bg-[#f7f9fe] p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
                      <it.icon size={24} strokeWidth={2} />
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-bold text-ok">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60 motion-reduce:hidden" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
                      </span>
                      진행 중
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <b className="text-xl">{it.name}</b>
                    <span className="text-sm text-sub">{it.desc}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#dbe5fb] pt-4">
                    <span className="tabular text-sm font-bold text-brand-dark">건당 40,000원 <span className="font-medium text-sub">VAT 별도</span></span>
                    <Link href="/signup" className="text-sm font-bold text-brand hover:text-brand-dark">지금 받기 →</Link>
                  </div>
                </div>
              ) : (
                <div key={it.name} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 sm:flex-col sm:items-stretch sm:p-6">
                  <div className="flex shrink-0 items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-sub sm:h-12 sm:w-12">
                      <it.icon size={22} strokeWidth={1.8} />
                    </span>
                    <span className="hidden rounded-full bg-soft px-2.5 py-1 text-xs font-bold text-[#6b7684] sm:inline">준비 중</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-none sm:gap-1">
                    <b className="text-base sm:text-xl">{it.name}</b>
                    <span className="text-[13px] text-sub sm:text-sm">{it.desc}</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-soft px-2.5 py-1 text-xs font-bold text-[#6b7684] sm:hidden">준비 중</span>
                  <span className="mt-auto hidden border-t border-line pt-4 text-sm font-medium text-[#6b7684] sm:block">곧 열립니다</span>
                </div>
              ),
            )}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-dashed border-[#d1d6db] p-5 sm:p-6">
              <div className="flex flex-col gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-[#c4cad0] text-[#6b7684]">
                  <Plus size={24} />
                </span>
                <div className="flex flex-col gap-1">
                  <b className="text-xl">더 많은 업종 준비 중</b>
                  <span className="text-sm text-sub">받고 싶은 업종이 있다면 알려주세요. 먼저 열어 드립니다.</span>
                </div>
              </div>
              <KakaoButton label="업종 요청하기" className="h-11 justify-center sm:h-10 sm:self-start" />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 sm:pb-20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 rounded-[20px] bg-brand p-6 text-white sm:p-12">
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-2.5">
            <h2 className="text-[22px] font-extrabold tracking-[-0.02em] sm:text-[32px]">결번이면 모두 돌려드립니다</h2>
            <p className="text-[15px] leading-relaxed text-[#e3eafb] sm:text-[17px]">DB를 받은 뒤 3시간 안에 불량 처리를 신청하면, 확인 후 예치금으로 환원됩니다.</p>
          </div>
          <Link href="/signup" className="inline-flex h-[52px] w-full items-center justify-center rounded-[10px] bg-white px-6 sm:w-auto text-base font-extrabold text-brand-dark hover:bg-[#f2f6fe]">
            광고주 가입 신청
          </Link>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 bg-page px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto flex max-w-[860px] flex-col gap-5 sm:gap-6">
          <h2 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em] sm:text-4xl">자주 묻는 질문</h2>
          <div className="rounded-2xl border border-line bg-white px-5 sm:px-7">
            {faqs.map(([q, a], i) => (
              <details key={q} open={i === 0} className={`group py-4 sm:py-5 ${i < faqs.length - 1 ? "border-b border-line" : ""}`}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-bold sm:text-lg [&::-webkit-details-marker]:hidden">
                  {q}
                  <span aria-hidden="true" className="shrink-0 text-xl leading-none text-[#6b7684] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-sub sm:text-base">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
