"use client";

// 광고주 홈의 실시간 DB 현황. 플랫폼 전체에 들어온 DB를 이름 가운데만 가려서 위로 굴려 보여준다.
// 연락처·차종은 보이지 않고, 상태는 저장소와 실시간으로 맞춰진다.
import { useEffect, useState } from "react";
import { maskMiddle, timeAgo } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { LeadStatus } from "@/lib/types";
import { Badge, Card } from "./ui";

const statusView: Record<LeadStatus, { label: string; tone: "blue" | "orange" | "gray" }> = {
  assigned: { label: "배정 완료", tone: "blue" },
  waiting: { label: "배정 대기", tone: "orange" },
  defect: { label: "불량 처리", tone: "gray" },
};

const ROW = 52;
const VISIBLE = 4;

export function LiveFeed() {
  const { state, now } = useStore();
  const items = [...state.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(true);
  const today = state.leads.filter((l) => new Date(l.createdAt).toDateString() === now.toDateString()).length;

  useEffect(() => {
    if (items.length <= VISIBLE) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setAnimate(true);
      setOffset((o) => o + 1);
    }, 2500);
    return () => clearInterval(t);
  }, [items.length]);

  // 한 바퀴 돌면 애니메이션 없이 처음 위치로 되돌린다 (목록을 두 번 이어 붙여 끊김 없이 보이게 함)
  useEffect(() => {
    if (offset < items.length) return;
    const t = setTimeout(() => {
      setAnimate(false);
      setOffset(0);
    }, 450);
    return () => clearTimeout(t);
  }, [offset, items.length]);

  const loop = items.length > VISIBLE ? [...items, ...items] : items;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bad opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-bad" />
          </span>
          <h2 className="text-[15px] font-bold">실시간 DB 현황</h2>
        </div>
        <span className="tabular text-[13px] text-sub">오늘 접수 {today}건</span>
      </div>
      <div className="relative overflow-hidden" style={{ height: ROW * Math.min(VISIBLE, Math.max(items.length, 1)) }}>
        <ul
          style={{
            transform: `translateY(-${offset * ROW}px)`,
            transition: animate ? "transform 420ms ease" : "none",
          }}
        >
          {loop.map((l, i) => {
            const v = statusView[l.status];
            return (
              <li key={`${l.id}-${i}`} className="flex items-center justify-between gap-3 border-b border-line px-5" style={{ height: ROW }}>
                <div className="flex items-center gap-3">
                  <span className="w-16 text-[15px] font-semibold">{maskMiddle(l.name)}</span>
                  <span className="text-[13px] text-mute">{timeAgo(l.createdAt, now)}</span>
                </div>
                <Badge tone={v.tone}>{v.label}</Badge>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
