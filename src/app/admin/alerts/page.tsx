"use client";

// 관리자 알림: 웹훅 실패, 서버 오류, 로그인 잠금, 백업 실패 등
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Empty, PageHeader } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useStore, type AdminAlert } from "@/lib/store";

const tone = { error: "red", warn: "orange", info: "blue" } as const;
const label = { error: "오류", warn: "주의", info: "안내" } as const;

export default function AlertsPage() {
  const { api, markAlertsRead, alerts: unread } = useStore();
  const [rows, setRows] = useState<AdminAlert[] | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ rows: AdminAlert[] }>("/api/admin/alerts");
    if (r.ok) setRows(r.data.rows);
  }, [api]);
  // 새 알림이 오면 목록도 다시 받는다.
  useEffect(() => {
    load();
  }, [load, unread.length]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="알림"
        desc="웹훅 접수 실패, 서버 오류, 로그인 잠금, 백업 실패가 여기에 쌓입니다"
        action={unread.length > 0 && <Button variant="secondary" onClick={async () => { await markAlertsRead("all"); load(); }}>모두 확인</Button>}
      />
      <Card>
        {!rows ? (
          <Empty title="불러오는 중…" />
        ) : rows.length === 0 ? (
          <Empty title="알림이 없습니다" />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((a) => (
              <li key={a.id} className={`flex flex-wrap items-start gap-3 px-5 py-4 ${a.read_at ? "" : "bg-bad-soft/40"}`}>
                <Badge tone={tone[a.level]}>{label[a.level]}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a.source}</p>
                  <p className="mt-0.5 text-sm break-all text-sub">{a.message}</p>
                  <p className="mt-1 text-xs text-mute">{dateTime(a.at)}{a.read_at ? ` · 확인함` : ""}</p>
                </div>
                {!a.read_at && (
                  <Button size="sm" variant="secondary" onClick={async () => { await markAlertsRead([a.id]); load(); }}>확인</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
