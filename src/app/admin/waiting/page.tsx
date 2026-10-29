"use client";

import { useState } from "react";
import { carLine } from "@/components/lead-parts";
import { Badge, Button, Card, Empty, Notice, PageHeader, Select } from "@/components/ui";
import { laneOf } from "@/lib/content";
import { balanceOf, checkAdvertiser, todayCount, type Ineligible } from "@/lib/engine";
import { dateTime, timeAgo, won } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Lead } from "@/lib/types";

const why: Record<Ineligible, string> = {
  off: "수신 OFF",
  balance: "잔액 부족",
  limit: "오늘 한도 초과",
  duplicate: "같은 번호 받음",
  group: "다른 그룹",
  status: "미승인",
  industry: "다른 업종",
};

function WaitingCard({ lead }: { lead: Lead }) {
  const { state, now, assignWaiting, assignWaitingToGroup } = useStore();
  const [advId, setAdvId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const approved = state.advertisers.filter((a) => a.status === "approved");

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold">{lead.name}</span>
            <span className="tabular text-sm text-sub">{lead.phone}</span>
            <Badge tone="orange">{lead.waitReason}</Badge>
            {lead.industry && <Badge tone="blue">{lead.industry}</Badge>}
          </div>
          <p className="mt-1 text-[13px] text-sub">{carLine(lead)} · {[lead.pageName, lead.site].filter(Boolean).join(" · ")}{lead.term ? ` · ${lead.term}` : ""}</p>
        </div>
        <p className="text-xs text-mute">{dateTime(lead.createdAt)} · {timeAgo(lead.createdAt, now)}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="flex gap-2">
          <Select value={advId} onChange={(e) => { setAdvId(e.target.value); setError(null); }}>
            <option value="">광고주 선택</option>
            {approved.filter((a) => laneOf(a.industry) === laneOf(lead.industry)).map((a) => {
              const w = checkAdvertiser(state, a, { ...lead, groupId: undefined }, now);
              return (
                <option key={a.id} value={a.id}>
                  {a.name} · 오늘 {todayCount(state, a.id, now)}/{state.settings.dailyLimit} · {won(balanceOf(state, a.id))}{w ? ` · ${why[w]}` : ""}
                </option>
              );
            })}
          </Select>
          <Button
            disabled={!advId}
            onClick={() => {
              const err = assignWaiting(lead.id, advId);
              if (err) setError(err);
            }}
          >
            승인 배정
          </Button>
        </div>
        <div className="flex gap-2">
          <Select value={groupId} onChange={(e) => { setGroupId(e.target.value); setError(null); }}>
            <option value="">그룹 선택</option>
            {state.groups.map((g, i) => <option key={g.id} value={g.id} disabled={!g.advertiserId}>{i + 1}번 그룹 · {state.advertisers.find((a) => a.id === g.advertiserId)?.name ?? "비어 있음"}</option>)}
          </Select>
          <Button
            variant="secondary"
            disabled={!groupId}
            onClick={() => {
              const err = assignWaitingToGroup(lead.id, groupId);
              if (err) setError(err);
            }}
          >
            그룹 배정
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-[13px] text-bad">{error}</p>}
    </Card>
  );
}

export default function WaitingPage() {
  const { state } = useStore();
  const waiting = state.leads.filter((l) => l.status === "waiting");
  return (
    <div>
      <PageHeader title="관리자 대기" desc="그날 한도를 넘었거나 받을 광고주가 없어 미배정된 DB입니다" />
      <div className="mb-4">
        <Notice>관리자 승인 배정은 하루 한도와 수신 OFF를 넘겨서 줄 수 있습니다. 업종이 다르거나, 예치금이 부족하거나, 같은 번호를 이미 받은 광고주에게는 배정되지 않습니다.</Notice>
      </div>
      {waiting.length === 0 ? (
        <Card><Empty title="대기 중인 DB가 없습니다" /></Card>
      ) : (
        <div className="space-y-3">{waiting.map((l) => <WaitingCard key={l.id} lead={l} />)}</div>
      )}
    </div>
  );
}
