"use client";

// 메인 화면의 운영 숫자 띠. "오늘 접수 DB"는 저장소 데이터로 계산해 실시간으로 바뀐다.
// PC에서는 4칸 한 줄, 모바일에서는 카드가 옆으로 계속 흘러간다.
import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { useStore } from "@/lib/store";

/** 이번 달 광고주 대기 인원 (운영에서 정하는 고정값) */
const WAITING_ADVERTISERS = 10;

/** 값이 바뀌면 이전 값에서 새 값까지 0.8초 동안 올라간다. */
function useCountUp(target: number) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      return setShown(target);
    }
    const start = performance.now();
    const base = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 800);
      const v = Math.round(base + (target - base) * (1 - (1 - p) ** 3));
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}

type Item = { label: string; value: number | string; unit: string; live?: boolean };

function Stat({ label, value, unit, live, className }: Item & { className?: string }) {
  const counted = useCountUp(typeof value === "number" ? value : 0);
  return (
    <div className={cx("flex min-w-0 flex-col gap-2 rounded-2xl bg-page px-5 py-5 sm:px-6 sm:py-6", className)}>
      <span className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-sub">
        {live && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bad opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-bad" />
          </span>
        )}
        {label}
      </span>
      <span className="tabular text-[32px] leading-none font-extrabold tracking-[-0.02em] whitespace-nowrap sm:text-[36px]">
        {typeof value === "number" ? counted.toLocaleString() : value}
        <span className="ml-1 text-base font-bold text-sub sm:text-lg">{unit}</span>
      </span>
    </div>
  );
}

export function LiveStats() {
  const { state, now } = useStore();
  const today = now.toDateString();
  const items: Item[] = [
    { label: "오늘 접수 DB", value: state.leads.filter((l) => new Date(l.createdAt).toDateString() === today).length, unit: "건", live: true },
    { label: "이번 달 대기 인원", value: WAITING_ADVERTISERS, unit: "명" },
    { label: "운영 브랜드 사이트", value: 10, unit: "개" },
    { label: "결번 환원 신청", value: "3시간", unit: "이내" },
  ];

  return (
    <>
      <div className="hidden grid-cols-2 gap-3 sm:grid lg:grid-cols-4">
        {items.map((it) => <Stat key={it.label} {...it} />)}
      </div>
      {/* 모바일: 같은 카드를 두 번 이어 붙여 끊김 없이 왼쪽으로 흐르게 한다 (누르고 있으면 멈춤) */}
      <div className="-mx-4 overflow-hidden pl-4 sm:hidden" aria-label="운영 현황">
        <div className="flex w-max motion-safe:animate-[stats-roll_18s_linear_infinite] active:[animation-play-state:paused]">
          {[...items, ...items].map((it, i) => (
            <Stat key={`${it.label}-${i}`} {...it} className="mr-3 w-[168px] shrink-0" />
          ))}
        </div>
      </div>
    </>
  );
}
