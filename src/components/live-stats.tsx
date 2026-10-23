"use client";

// 메인 화면의 운영 숫자 띠. 앞의 두 칸은 저장소 데이터로 계산해 실시간으로 바뀐다.
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";

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

function Stat({ label, value, unit, live }: { label: string; value: number | string; unit: string; live?: boolean }) {
  const counted = useCountUp(typeof value === "number" ? value : 0);
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl bg-page px-4 py-4 sm:px-5">
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-sub">
        {live && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bad opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bad" />
          </span>
        )}
        {label}
      </span>
      <span className="tabular text-[26px] leading-none font-extrabold tracking-[-0.02em] sm:text-[28px]">
        {typeof value === "number" ? counted.toLocaleString() : value}
        <span className="ml-0.5 text-[15px] font-bold text-sub">{unit}</span>
      </span>
    </div>
  );
}

export function LiveStats() {
  const { state, now } = useStore();
  const today = now.toDateString();
  const month = `${now.getFullYear()}-${now.getMonth()}`;
  const todayCount = state.leads.filter((l) => new Date(l.createdAt).toDateString() === today).length;
  const monthAssigned = state.leads.filter((l) => {
    const d = new Date(l.createdAt);
    return l.status !== "waiting" && `${d.getFullYear()}-${d.getMonth()}` === month;
  }).length;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      <Stat label="오늘 접수 DB" value={todayCount} unit="건" live />
      <Stat label="이번 달 단독 배정" value={monthAssigned} unit="건" live />
      <Stat label="운영 브랜드 사이트" value={10} unit="개" />
      <Stat label="결번 환원 신청" value="3시간" unit=" 이내" />
    </div>
  );
}
