"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, PageHeader, Select, Toggle } from "@/components/ui";
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

const adminSample = `POST /api/v1/assign
X-Connection-Key: ak_xxxxxxxx

{ "leadId": "ld_123", "advertiserId": "adv1" }   // 개별 배정
{ "leadId": "ld_123", "groupId": "g1" }          // 그룹 배정

→ 배정 결과는 등록한 회신 주소(Webhook)로 보내드립니다.`;

export default function IntegrationsPage() {
  const { state, updateSettings } = useStore();
  const { connections, solapi } = state.settings;
  const [newConn, setNewConn] = useState({ name: "", type: "landing" as Connection["type"] });
  const [sol, setSol] = useState(solapi);
  const [saved, setSaved] = useState(false);

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
        <CardHeader title="연결 목록" desc="연결마다 웹훅 URL(키 포함)을 발급합니다. 키가 틀리거나 중지된 연결의 요청은 거절합니다." />
        <ul className="divide-y divide-line">
          {connections.map((c) => (
            <li key={c.id} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={c.type === "landing" ? "blue" : "orange"}>{c.type === "landing" ? "웹훅 접수" : "외부 어드민"}</Badge>
                <span className="flex-1 text-sm font-semibold">{c.name}</span>
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
            setConnections([...connections, { id: uid("cn"), name: newConn.name.trim(), type: newConn.type, key, active: true }]);
            setNewConn({ ...newConn, name: "" });
          }}
        >
          <Select className="w-36" value={newConn.type} onChange={(e) => setNewConn({ ...newConn, type: e.target.value as Connection["type"] })}>
            <option value="landing">웹훅 접수</option>
            <option value="admin">외부 어드민</option>
          </Select>
          <Input className="min-w-48 flex-1" placeholder="매체 사이트명 (예: 전기차 견적 사이트)" value={newConn.name} onChange={(e) => setNewConn({ ...newConn, name: e.target.value })} />
          <Button type="submit" disabled={!newConn.name.trim()}>키 발급</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="솔라피 알림톡" desc="DB 도착, 자동 OFF, 충전 완료, 가입 승인, 불량 처리 결과를 광고주에게 보냅니다" />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="API 키"><Input type="password" placeholder="솔라피 API 키" value={sol.apiKey} onChange={(e) => setSol({ ...sol, apiKey: e.target.value })} /></Field>
          <Field label="채널 이름"><Input value={sol.channel} onChange={(e) => setSol({ ...sol, channel: e.target.value })} /></Field>
          <Field label="PFID (발신 프로필 ID)" hint="솔라피에 연결한 카카오톡 채널의 PFID"><Input value={sol.pfId ?? ""} onChange={(e) => setSol({ ...sol, pfId: e.target.value.trim() })} placeholder="KA01PF..." /></Field>
          <Field label="대체 문자 발신번호"><Input value={sol.sender} onChange={(e) => setSol({ ...sol, sender: e.target.value })} /></Field>
        </div>
        <ul className="mx-5 mb-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {[["PFID", !!sol.pfId], ["API 키", !!sol.apiKey], ["발신번호", !!sol.sender]].map(([k, ok]) => (
            <li key={String(k)} className={ok ? "font-semibold text-ok" : "text-mute"}>{ok ? "✓" : "○"} {k} {ok ? "등록됨" : "미등록"}</li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-[13px] text-mute">알림톡 템플릿은 카카오 심사를 받은 뒤 등록합니다. 발송 기능은 API 키와 승인된 템플릿이 준비되면 연결합니다.</p>
          <Button onClick={() => { updateSettings({ solapi: sol }); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
            {saved ? "저장됨" : "저장"}
          </Button>
        </div>
      </Card>

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
