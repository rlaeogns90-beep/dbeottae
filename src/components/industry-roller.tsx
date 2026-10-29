"use client";

// 메인 첫 화면의 업종 카드. 업종별 DB 단가·상태가 옆으로 자동 넘어가고,
// 점을 누르거나 손가락으로 밀어서 직접 넘길 수 있다. 마우스를 올리거나 누르고 있으면 멈춘다.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

export interface IndustrySlide {
  name: string;
  desc: string;
  icon: React.ElementType;
  live?: boolean;
  /** 건당 공급가 (VAT 별도) */
  price?: number;
}

const INTERVAL = 3500;

export function IndustryRoller({ items }: { items: IndustrySlide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = items.length;
  const go = (to: number) => setI(((to % n) + n) % n);

  useEffect(() => {
    if (paused || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), INTERVAL);
    return () => clearInterval(t);
  }, [paused, n]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="DB 구매 가능 업종"
      className="relative overflow-hidden rounded-2xl bg-brand text-white shadow-[0_12px_28px_rgba(38,89,217,0.25)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? e.changedTouches[0].clientX);
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        touchX.current = null;
        setPaused(false);
      }}
    >
      <div className="flex items-center justify-between px-5 pt-4 sm:px-7 sm:pt-5">
        <span className="text-[13px] font-bold text-white/80 sm:text-sm">DB 구매 가능 업종</span>
        <span className="tabular text-xs font-semibold text-white/70">{i + 1} / {n}</span>
      </div>

      <div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${i * 100}%)` }}>
        {items.map((it, k) => (
          <div key={it.name} className="w-full shrink-0 px-5 pt-2 pb-5 sm:px-7 sm:pb-6" aria-hidden={k !== i} role="group" aria-label={`${k + 1}/${n} ${it.name}`}>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
                <it.icon size={16} strokeWidth={2.2} />
              </span>
              <b className="text-base sm:text-[17px]">{it.name} 단독 실시간 DB</b>
              <span className={cx("ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", it.live ? "bg-white text-brand" : "bg-white/15 text-white")}>
                {it.live ? "진행 중" : "준비 중"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-1.5">
              {it.live ? (
                <span className="tabular text-[38px] leading-none font-extrabold tracking-[-0.03em] sm:text-[44px]">{it.price?.toLocaleString()}원</span>
              ) : (
                <span className="text-[30px] leading-none font-extrabold tracking-[-0.03em] sm:text-[36px]">오픈 준비 중</span>
              )}
              <span className="pb-1 text-sm text-white/80 sm:text-[15px]">
                {it.live ? "1건 · VAT 별도 · 패키지 없음 · 받은 만큼만 차감" : `${it.desc} · 가격 협의 중`}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/15 px-3 py-1.5 sm:px-5">
        <button type="button" aria-label="이전 업종" onClick={() => go(i - 1)} className="flex h-11 w-11 items-center justify-center rounded-lg text-white/80 hover:bg-white/10">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center">
          {items.map((it, k) => (
            <button key={it.name} type="button" aria-label={`${it.name} 보기`} aria-current={k === i} onClick={() => go(k)} className="flex h-11 w-8 items-center justify-center">
              <span className={cx("h-1.5 rounded-full transition-all", k === i ? "w-5 bg-white" : "w-1.5 bg-white/40")} />
            </button>
          ))}
        </div>
        <button type="button" aria-label="다음 업종" onClick={() => go(i + 1)} className="flex h-11 w-11 items-center justify-center rounded-lg text-white/80 hover:bg-white/10">
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
