"use client";

// 솔라피 알림톡 설정 카드 (관리자 › 외부 연동·알림톡)
// API Key·Secret은 서버 환경변수에만 있어서 여기서 입력하지 않는다 (등록 여부만 표시).
import { useState } from "react";
import { MAX_TASK_PHONES, TASK_KINDS } from "@/lib/actions";
import { formatPhone } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { TaskKind } from "@/lib/types";
import { Badge, Button, Card, CardHeader, cx, Field, Input, Toggle } from "./ui";

const TASK_NAME: Record<TaskKind, string> = { member: "가입 승인", deposit: "입금 확인", defect: "불량 처리", support: "고객센터" };

export function SolapiCard() {
  const { state, updateSettings, api } = useStore();
  const [sol, setSol] = useState(state.settings.solapi);
  const [saved, setSaved] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const set = (patch: Partial<typeof sol>) => setSol({ ...sol, ...patch });
  const keyReady = !!state.settings.solapi.keyReady;

  const checks: [string, boolean][] = [
    ["API Key·Secret (서버)", keyReady],
    ["PFID", !!sol.pfId],
    ["발신번호", !!sol.sender],
    ["문의 접수 템플릿", !!sol.templateInquiry],
    ["통계 알림 템플릿", !!sol.templateStats],
    ["처리 알림 템플릿", !!sol.templateTask],
    ["충전 완료 템플릿", !!sol.templateCharged],
  ];
  const ready = checks.slice(0, 4).every(([, ok]) => ok);

  const save = (next = sol) => {
    // 빈 칸은 빼고 저장한다.
    const taskPhones = Object.fromEntries(TASK_KINDS.map((k) => [k, (next.taskPhones?.[k] ?? []).filter((p) => p.replace(/\D/g, "").length >= 10)]));
    updateSettings({ solapi: { ...next, taskPhones } });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const test = async (which: "inquiry" | "stats" | "task" | "charged") => {
    setBusy(which);
    setTestMsg(null);
    const r = await api<{ error?: string }>("/api/admin/solapi-test", { to: testTo, which });
    setBusy(null);
    setTestMsg(r.ok ? { ok: true, text: "테스트 알림톡을 보냈습니다. 휴대폰에서 확인해 주세요. (솔라피 잔액에서 요금이 나갑니다)" } : { ok: false, text: r.data.error ?? "보내지 못했습니다." });
  };

  return (
    <Card>
      <CardHeader title="솔라피 알림톡" desc="새 DB 배정·충전 완료는 광고주에게, DB 접수 통계와 처리할 일(가입·입금·불량·문의)은 관리자에게 알림톡으로 보냅니다" />

      <div className="space-y-3 border-b border-line px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">알림톡 발송</p>
            <p className="mt-0.5 text-[13px] text-mute">{ready ? "켜면 새 DB가 배정될 때마다 광고주에게 바로 발송됩니다" : "연결 정보가 모두 준비돼야 켤 수 있습니다"}</p>
          </div>
          <Toggle on={sol.enabled && ready} disabled={!ready} onChange={(v) => { const n = { ...sol, enabled: v }; setSol(n); save(n); }} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">관리자 통계 알림</p>
            <p className="mt-0.5 text-[13px] text-mute">새 DB가 접수될 때마다 오늘 접수 수와 중복 제외 수를 관리자 번호로 보냅니다</p>
          </div>
          <Toggle on={sol.statsEnabled && sol.enabled && ready && !!sol.statsPhone} disabled={!ready || !sol.statsPhone} onChange={(v) => { const n = { ...sol, statsEnabled: v }; setSol(n); save(n); }} />
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="채널 이름"><Input value={sol.channel} onChange={(e) => set({ channel: e.target.value })} /></Field>
        <Field label="PFID (발신 프로필 ID)" hint="솔라피에 연결한 카카오톡 채널의 PFID"><Input value={sol.pfId ?? ""} onChange={(e) => set({ pfId: e.target.value.trim() })} placeholder="KA01PF..." /></Field>
        <Field label="발신번호" hint="솔라피에 등록된 번호 (알림톡이 안 가면 문자로 대신 발송)"><Input value={sol.sender} onChange={(e) => set({ sender: e.target.value })} /></Field>
        <Field label="문의 접수 템플릿 ID (광고주용)"><Input value={sol.templateInquiry ?? ""} onChange={(e) => set({ templateInquiry: e.target.value.trim() })} placeholder="KA01TP..." /></Field>
        <Field label="통계 알림 템플릿 ID (관리자용)"><Input value={sol.templateStats ?? ""} onChange={(e) => set({ templateStats: e.target.value.trim() })} placeholder="KA01TP..." /></Field>
        <Field label="통계 알림 받을 관리자 번호"><Input inputMode="numeric" value={sol.statsPhone ?? ""} onChange={(e) => set({ statsPhone: formatPhone(e.target.value) })} placeholder="010-0000-0000" /></Field>
        <Field label="처리 알림 템플릿 ID (관리자용)" hint="가입·입금·불량·문의가 들어오면"><Input value={sol.templateTask ?? ""} onChange={(e) => set({ templateTask: e.target.value.trim() })} placeholder="KA01TP..." /></Field>
        <Field label="충전 완료 템플릿 ID (광고주용)" hint="입금을 확인하면 광고주에게"><Input value={sol.templateCharged ?? ""} onChange={(e) => set({ templateCharged: e.target.value.trim() })} placeholder="KA01TP..." /></Field>
      </div>

      <div className="border-t border-line px-5 py-4">
        <p className="text-sm font-semibold">처리 알림 받을 번호</p>
        <p className="mt-0.5 text-[13px] text-mute">처리 탭에 새 일이 생기면 종류별로 등록한 번호(최대 {MAX_TASK_PHONES}개)에 알림톡을 보냅니다. 비워 두면 그 종류는 보내지 않습니다.</p>
        <div className="mt-3 space-y-2.5">
          {TASK_KINDS.map((k) => {
            const list = sol.taskPhones?.[k] ?? [];
            const setAt = (i: number, v: string) => {
              const next = [...list];
              next[i] = formatPhone(v);
              set({ taskPhones: { ...sol.taskPhones, [k]: next } });
            };
            return (
              <div key={k} className="grid grid-cols-3 items-center gap-2 sm:grid-cols-[6rem_repeat(3,minmax(0,1fr))]">
                <span className="col-span-3 text-[13px] font-semibold text-sub sm:col-span-1">{TASK_NAME[k]}</span>
                {Array.from({ length: MAX_TASK_PHONES }, (_, i) => (
                  <Input key={i} aria-label={`${TASK_NAME[k]} 번호 ${i + 1}`} inputMode="numeric" value={list[i] ?? ""} onChange={(e) => setAt(i, e.target.value)} placeholder="010-0000-0000" />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <ul className="mx-5 mb-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
        {checks.map(([k, ok]) => (
          <li key={k} className={ok ? "font-semibold text-ok" : "text-mute"}>{ok ? "✓" : "○"} {k} {ok ? "등록됨" : "미등록"}</li>
        ))}
      </ul>

      <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-4">
        <Button onClick={() => save()}>{saved ? "저장됨" : "저장"}</Button>
      </div>

      <div className="border-t border-line px-5 py-4">
        <p className="text-sm font-semibold">테스트 발송</p>
        <p className="mt-0.5 text-[13px] text-mute">입력한 번호로 예시 내용의 알림톡 1건을 보냅니다. 켜기 전에 먼저 확인해 보세요. 건당 요금이 솔라피 잔액에서 나갑니다.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input className="w-44" inputMode="numeric" value={testTo} onChange={(e) => setTestTo(formatPhone(e.target.value))} placeholder="받을 번호" />
          <Button variant="secondary" size="sm" disabled={!ready || !!busy} onClick={() => test("inquiry")}>{busy === "inquiry" ? "보내는 중…" : "문의 접수 보내기"}</Button>
          <Button variant="secondary" size="sm" disabled={!ready || !sol.templateStats || !!busy} onClick={() => test("stats")}>{busy === "stats" ? "보내는 중…" : "통계 알림 보내기"}</Button>
          <Button variant="secondary" size="sm" disabled={!ready || !sol.templateTask || !!busy} onClick={() => test("task")}>{busy === "task" ? "보내는 중…" : "처리 알림 보내기"}</Button>
          <Button variant="secondary" size="sm" disabled={!ready || !sol.templateCharged || !!busy} onClick={() => test("charged")}>{busy === "charged" ? "보내는 중…" : "충전 완료 보내기"}</Button>
        </div>
        {testMsg && <p className={cx("mt-2 text-[13px]", testMsg.ok ? "text-brand" : "text-bad")}>{testMsg.text}</p>}
        <p className="mt-2"><Badge tone={keyReady ? "green" : "orange"}>{keyReady ? "서버에 솔라피 키 등록됨" : "이 환경에는 솔라피 키가 없습니다 (운영 사이트에서만 발송됩니다)"}</Badge></p>
      </div>
    </Card>
  );
}
