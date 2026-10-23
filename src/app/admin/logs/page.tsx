"use client";

// 보안 기록 (마스터만): 관리자 로그인·실패, 관리자 작업, 비밀번호 변경
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/shells";
import { Card, Empty, PageHeader, Table, td, th } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useStore } from "@/lib/store";

interface Row { id: number; at: string; actor: string; role: string; action: string; detail: string; ip: string }

export default function LogsPage() {
  const me = useAdmin()!;
  const { api } = useStore();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (me.master) api<{ rows: Row[] }>("/api/admin/logs").then((r) => r.ok && setRows(r.data.rows));
  }, [api, me.master]);

  if (!me.master) return <Card><Empty title="마스터 계정만 볼 수 있는 화면입니다" /></Card>;
  return (
    <div>
      <PageHeader title="보안 기록" desc="관리자 로그인과 실패, 관리자가 한 작업, 비밀번호 변경을 최근 300건까지 보여줍니다" />
      <Card>
        {!rows ? (
          <Empty title="불러오는 중…" />
        ) : rows.length === 0 ? (
          <Empty title="기록이 없습니다" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>시각</th>
                <th className={th}>계정</th>
                <th className={th}>작업</th>
                <th className={th}>내용</th>
                <th className={th}>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} tabular whitespace-nowrap`}>{dateTime(r.at)}</td>
                  <td className={`${td} whitespace-nowrap`}>{r.actor}</td>
                  <td className={`${td} whitespace-nowrap font-semibold ${r.action.includes("실패") ? "text-bad" : ""}`}>{r.action}</td>
                  <td className={`${td} max-w-md break-all text-xs text-sub`}>{r.detail || "-"}</td>
                  <td className={`${td} tabular text-xs text-mute`}>{r.ip}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
