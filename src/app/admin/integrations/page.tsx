"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, CardHeader, Input, Notice, PageHeader, Select, Toggle } from "@/components/ui";
import { SolapiCard } from "@/components/solapi-card";
import { DEFAULT_INDUSTRY, industryOptions } from "@/lib/content";
import { uid } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Connection } from "@/lib/types";

const webhookFields: [string, string][] = [
  ["user_name", "이름 (필수)"],
  ["user_phone", "연락처 (필수)"],
  ["car_name", "차종"],
  ["car_memo", "메모"],
  ["source", "매체"],
  ["page_name", "페이지명"],
  ["term", "광고소재명"],
];

const liveIndustries = industryOptions.filter((o) => o.live);

const adminSample = `POST /api/v1/assign
X-Connection-Key: ak_xxxxxxxx

{ "leadId": "ld_123", "advertiserId": "adv1" }   // 개별 배정
{ "leadId": "ld_123", "groupId": "g1" }          // 그룹 배정

→ 배정 결과는 등록한 회신 주소(Webhook)로 보내드립니다.`;

export default function IntegrationsPage() {
  const { state, updateSettings } = useStore();
  const { connections } = state.settings;
  const [newConn, setNewConn] = useState({ name: "", type: "landing" as Connection["type"], industry: DEFAULT_INDUSTRY });

  const setConnections = (next: Connection[]) => updateSettings({ connections: next });
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const hookUrl = (c: Connection) => `${origin}/api/webhook?key=${c.key}`;
  const copy = (c: Connection) => {
    navigator.clipboard?.writeText(hookUrl(c));
    setCopied(c.id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="외부 연동 · 알림톡" desc="웹훅(제피어 등)과 외부 관리자 어드민, 솔라피 알림톡을 연결합니다" />

      <Card>
        <CardHeader title="연결 목록" desc="연결마다 웹훅 URL(키 포함)을 발급합니다. 들어온 DB는 연결에 정한 업종의 광고주에게만 배정됩니다. 키가 틀리거나 중지된 연결의 요청은 거절합니다." />
        <ul className="divide-y divide-line">
          {connections.map((c) => (
            <li key={c.id} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={c.type === "landing" ? "blue" : "orange"}>{c.type === "landing" ? "웹훅 접수" : "외부 어드민"}</Badge>
                <span className="flex-1 text-sm font-semibold">{c.name}</span>
                {c.type === "landing" && (
                  <div className="w-40 shrink-0">
                    <Select
                      aria-label={`${c.name} 업종`}
                      value={c.industry ?? DEFAULT_INDUSTRY}
                      onChange={(e) => setConnections(connections.map((x) => (x.id === c.id ? { ...x, industry: e.target.value } : x)))}
                    >
                      {liveIndustries.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
                    </Select>
                  </div>
                )}
                <Toggle on={c.active} onChange={(v) => setConnections(connections.map((x) => (x.id === c.id ? { ...x, active: v } : x)))} />
              </div>
              {c.type === "landing" ? (
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-soft px-2 py-1.5 text-xs text-sub">{hookUrl(c)}</code>
                  <Button size="sm" variant="secondary" onClick={() => copy(c)}>
                    {copied === c.id ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 웹훅 URL 복사</>}
                  </Button>
                </div>
              ) : (
                <code className="mt-2 inline-block rounded bg-soft px-2 py-1 text-xs text-sub">{c.key}</code>
              )}
            </li>
          ))}
        </ul>
        <form
          className="flex flex-wrap gap-2 border-t border-line px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newConn.name.trim()) return;
            const key = `${newConn.type === "landing" ? "lk" : "ak"}_${Math.random().toString(16).slice(2, 10)}`;
            setConnections([...connections, { id: uid("cn"), name: newConn.name.trim(), type: newConn.type, key, active: true, industry: newConn.type === "landing" ? newConn.industry : undefined }]);
            setNewConn({ ...newConn, name: "" });
          }}
        >
          <Select className="w-36" value={newConn.type} onChange={(e) => setNewConn({ ...newConn, type: e.target.value as Connection["type"] })}>
            <option value="landing">웹훅 접수</option>
            <option value="admin">외부 어드민</option>
          </Select>
          {newConn.type === "landing" && (
            <div className="w-40 shrink-0">
              <Select aria-label="업종" value={newConn.industry} onChange={(e) => setNewConn({ ...newConn, industry: e.target.value })}>
                {liveIndustries.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
              </Select>
            </div>
          )}
          <Input className="min-w-48 flex-1" placeholder="매체 사이트명 (예: 전기차 견적 사이트)" value={newConn.name} onChange={(e) => setNewConn({ ...newConn, name: e.target.value })} />
          <Button type="submit" disabled={!newConn.name.trim()}>키 발급</Button>
        </form>
      </Card>

      <SolapiCard />

      <Card>
        <CardHeader title="제피어(Zapier) 웹훅 설정" desc="메타 잠재고객 → 제피어 → 웹훅 → 디비어때" />
        <div className="space-y-4 p-5">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-sub">
            <li>제피어에서 트리거를 <b className="text-ink">Facebook Lead Ads (새 잠재고객)</b>로 정합니다.</li>
            <li>액션을 <b className="text-ink">Webhooks by Zapier → POST</b>로 고르고, URL에 위 연결의 웹훅 URL을 붙여 넣습니다.</li>
            <li>Payload Type은 <b className="text-ink">json</b>(form도 됨)으로 두고, Data에 아래 이름으로 항목을 연결합니다.</li>
          </ol>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="bg-page text-left text-xs text-sub">
                <tr><th className="px-4 py-2 font-semibold">웹훅 항목 이름</th><th className="px-4 py-2 font-semibold">디비어때 항목</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {webhookFields.map(([k, v]) => (
                  <tr key={k}><td className="px-4 py-2"><code className="text-xs">{k}</code></td><td className="px-4 py-2">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <Notice>이름과 연락처가 없으면 접수하지 않습니다. 연락처는 +82 형식도 010-0000-0000으로 바꿔 저장합니다. 들어온 DB는 하루 한도, 같은 번호 재배정 방지, 잔액 확인 규칙대로 바로 배정됩니다.</Notice>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-sub">배정 (외부 어드민 → DB어때, 준비 중)</p>
            <pre className="overflow-x-auto rounded-lg bg-[#1f2329] p-4 text-xs leading-relaxed text-[#e6e8eb]">{adminSample}</pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
