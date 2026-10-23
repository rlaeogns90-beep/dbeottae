"use client";

// 백업 목록 (매일 새벽 3시 자동 + 마스터가 바로 만들기), 마스터는 원하는 시점으로 되돌릴 수 있다.
import { useCallback, useEffect, useState } from "react";
import { dateTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Button, Card, CardHeader, ConfirmButton, Empty } from "./ui";

interface Row { id: number; at: string; size: number; leads: number; advertisers: number }

export function BackupsCard({ master }: { master: boolean }) {
  const { api } = useStore();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ rows: Row[] }>("/api/admin/backups");
    if (r.ok) setRows(r.data.rows);
  }, [api]);
  useEffect(() => {
    load();
  }, [load]);

  const post = async (body: unknown, done: string) => {
    const r = await api<{ error?: string }>("/api/admin/backups", body);
    setMsg(r.ok ? done : r.data.error ?? "처리하지 못했습니다.");
    load();
  };

  return (
    <Card>
      <CardHeader
        title="백업"
        desc="매일 새벽 3시에 전체 데이터를 자동으로 백업하고, 최근 30개를 보관합니다"
        action={master && <Button size="sm" variant="secondary" onClick={() => post({ action: "create" }, "지금 상태를 백업했습니다.")}>지금 백업</Button>}
      />
      {msg && <p className="px-5 pt-3 text-[13px] text-brand">{msg}</p>}
      {!rows ? (
        <Empty title="불러오는 중…" />
      ) : rows.length === 0 ? (
        <Empty title="아직 백업이 없습니다" />
      ) : (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
          {rows.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="tabular text-sm font-semibold">{dateTime(b.at)}</p>
                <p className="text-xs text-mute">DB {b.leads}건 · 광고주 {b.advertisers}명 · {(b.size / 1024).toFixed(0)}KB</p>
              </div>
              {master && (
                <ConfirmButton variant="secondary" size="sm" confirmLabel="한 번 더 누르면 이 시점으로 되돌림" onConfirm={() => post({ action: "restore", id: b.id }, "백업 시점으로 되돌렸습니다. 되돌리기 직전 상태도 백업해 두었습니다.")}>
                  이 시점으로 복원
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
