"use client";

import { useState } from "react";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, PageHeader, Select, Toggle } from "@/components/ui";
import { uid } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Connection } from "@/lib/types";

const leadSample = `POST /api/v1/leads
X-Connection-Key: lk_xxxxxxxx

{
  "name": "홍길동",          // 필수
  "phone": "010-1234-5678",  // 필수
  "car": "현대 그랜저",       // 필수
  "months": 48,              // 필수
  "verified": true,          // 본인인증 완료 여부
  "consent": { "at": "2026-10-22T10:00:00+09:00", "version": "v1" },
  "site": "장기렌트 견적 사이트",  // 매체 사이트명
  "brand": "현대",                 // 유입 브랜드 (광고주에게는 브랜드만 보임)
  "groupId": "g1"            // 선택: 그룹 지정 배정
}`;

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

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="외부 연동 · 알림톡" desc="외부 접수 페이지와 외부 관리자 어드민, 솔라피 알림톡을 연결합니다" />

      <Card>
        <CardHeader title="연결 목록" desc="연결마다 키를 발급합니다. 키가 없거나 중지된 연결의 요청은 거절합니다." />
        <ul className="divide-y divide-line">
          {connections.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <Badge tone={c.type === "landing" ? "blue" : "orange"}>{c.type === "landing" ? "접수 페이지" : "외부 어드민"}</Badge>
              <span className="flex-1 text-sm font-semibold">{c.name}</span>
              <code className="rounded bg-soft px-2 py-1 text-xs text-sub">{c.key}</code>
              <Toggle on={c.active} onChange={(v) => setConnections(connections.map((x) => (x.id === c.id ? { ...x, active: v } : x)))} />
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
            <option value="landing">접수 페이지</option>
            <option value="admin">외부 어드민</option>
          </Select>
          <Input className="min-w-48 flex-1" placeholder="매체 사이트명 (예: 전기차 견적 사이트)" value={newConn.name} onChange={(e) => setNewConn({ ...newConn, name: e.target.value })} />
          <Button type="submit" disabled={!newConn.name.trim()}>키 발급</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="솔라피 알림톡" desc="DB 도착, 자동 OFF, 충전 완료, 가입 승인, 불량 처리 결과를 광고주에게 보냅니다" />
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <Field label="API 키"><Input type="password" placeholder="솔라피 API 키" value={sol.apiKey} onChange={(e) => setSol({ ...sol, apiKey: e.target.value })} /></Field>
          <Field label="발신 프로필 (카카오톡 채널)"><Input value={sol.channel} onChange={(e) => setSol({ ...sol, channel: e.target.value })} /></Field>
          <Field label="대체 문자 발신번호"><Input value={sol.sender} onChange={(e) => setSol({ ...sol, sender: e.target.value })} /></Field>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-[13px] text-mute">알림톡 템플릿은 카카오 심사를 받은 뒤 등록합니다.</p>
          <Button onClick={() => { updateSettings({ solapi: sol }); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
            {saved ? "저장됨" : "저장"}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="개발자용 연동 방법" desc="외부 접수 페이지와 외부 어드민 개발자에게 전달하세요" />
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-sub">DB 접수 (외부 접수 페이지 → DB어때)</p>
            <pre className="overflow-x-auto rounded-lg bg-[#1f2329] p-4 text-xs leading-relaxed text-[#e6e8eb]">{leadSample}</pre>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-sub">배정 (외부 어드민 → DB어때)</p>
            <pre className="overflow-x-auto rounded-lg bg-[#1f2329] p-4 text-xs leading-relaxed text-[#e6e8eb]">{adminSample}</pre>
          </div>
        </div>
        <div className="px-5 pb-5">
          <Notice>차종, 개월수, 이름, 연락처 중 하나라도 빠진 접수는 거절합니다. 어느 경로로 배정하든 하루 한도, 같은 번호 재배정 방지, 잔액 확인 규칙을 똑같이 적용합니다.</Notice>
        </div>
      </Card>
    </div>
  );
}
