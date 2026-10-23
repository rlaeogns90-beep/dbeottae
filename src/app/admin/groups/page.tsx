"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, cx, Notice, PageHeader, Select } from "@/components/ui";
import { balanceOf, groupOf, todayCount } from "@/lib/engine";
import { won } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function GroupsPage() {
  const { state, now, addGroup, removeGroup, setGroupAdvertiser, moveGroup } = useStore();
  // 승인된 광고주와 가입 후 승인 대기 중인 광고주 모두 넣을 수 있다.
  const candidates = state.advertisers.filter((a) => a.status === "approved" || a.status === "pending");
  const lastNo = state.groups.findIndex((g) => g.id === state.settings.lastGroupId) + 1;
  const unplaced = candidates.filter((a) => !groupOf(state, a.id));

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="그룹 순번"
        desc="그룹 하나에 광고주 1명씩 넣습니다. 새 DB는 1번 그룹부터 차례대로 돌아가며 배정됩니다."
        action={<Button onClick={addGroup}><Plus size={16} /> 그룹 추가</Button>}
      />

      <div className="mb-4 space-y-2">
        <Notice tone="blue">
          {lastNo > 0 ? `마지막 배정: ${lastNo}번 그룹 → 다음 DB는 ${lastNo + 1 > state.groups.length ? 1 : lastNo + 1}번 그룹부터 찾습니다.` : "다음 DB는 1번 그룹부터 배정합니다."}{" "}
          수신 OFF, 잔액 부족, 오늘 3건을 채운 그룹은 건너뜁니다.
        </Notice>
        {unplaced.length > 0 && (
          <Notice>그룹에 들어가지 않은 광고주 {unplaced.length}명: {unplaced.map((a) => a.name).join(", ")} · 그룹에 넣어야 자동 배정을 받습니다.</Notice>
        )}
      </div>

      <Card>
        <ul className="divide-y divide-line">
          {state.groups.map((g, i) => {
            const adv = state.advertisers.find((a) => a.id === g.advertiserId);
            const isNext = lastNo > 0 && i === lastNo % state.groups.length;
            return (
              <li key={g.id} className={cx("flex flex-wrap items-center gap-3 px-5 py-3.5", isNext && "bg-brand-soft/50")}>
                <div className="flex w-20 items-center gap-1.5">
                  <span className="tabular text-[15px] font-bold">{i + 1}번</span>
                  {isNext && <span className="text-[11px] font-semibold text-brand">다음</span>}
                </div>

                <Select
                  className="h-10 min-w-56 flex-1"
                  value={g.advertiserId ?? ""}
                  onChange={(e) => setGroupAdvertiser(g.id, e.target.value || undefined)}
                >
                  <option value="">비어 있음</option>
                  {candidates.map((a) => {
                    const other = groupOf(state, a.id);
                    const otherNo = other && other.id !== g.id ? state.groups.indexOf(other) + 1 : 0;
                    return (
                      <option key={a.id} value={a.id}>
                        {a.name}{a.company ? ` · ${a.company}` : ""}{a.status === "pending" ? " (승인 대기)" : ""}{otherNo ? ` · 현재 ${otherNo}번` : ""}
                      </option>
                    );
                  })}
                </Select>

                <div className="flex w-56 flex-wrap items-center gap-1.5 text-xs text-sub">
                  {adv ? (
                    adv.status === "pending" ? (
                      <Badge tone="orange">승인 대기 · 배정 안 됨</Badge>
                    ) : (
                      <>
                        {adv.receiving ? <Badge tone="blue">수신 ON</Badge> : <Badge>수신 OFF</Badge>}
                        <span className="tabular">오늘 {todayCount(state, adv.id, now)}/{state.settings.dailyLimit}</span>
                        <span className="tabular">· {won(balanceOf(state, adv.id))}</span>
                      </>
                    )
                  ) : (
                    <span className="text-mute">광고주를 선택하세요</span>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-0.5">
                  <button onClick={() => moveGroup(g.id, -1)} disabled={i === 0} className="rounded-md p-1.5 text-mute hover:bg-soft disabled:opacity-30" aria-label="위로">
                    <ArrowUp size={16} />
                  </button>
                  <button onClick={() => moveGroup(g.id, 1)} disabled={i === state.groups.length - 1} className="rounded-md p-1.5 text-mute hover:bg-soft disabled:opacity-30" aria-label="아래로">
                    <ArrowDown size={16} />
                  </button>
                  <button onClick={() => removeGroup(g.id)} className="rounded-md p-1.5 text-mute hover:bg-soft hover:text-bad" aria-label="그룹 삭제">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
