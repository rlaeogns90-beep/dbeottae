// 광고주 상담 메모 기록. 예전에는 메모가 한 칸(memo)뿐이었으므로, 기록(memos)이 없으면 그 글을 시각 없는 한 줄로 보여준다.
import type { Assignment } from "./types";

type HasMemo = Pick<Assignment, "memo" | "memos">;

/** 최신순 메모 기록 */
export const memoLog = (a: HasMemo): { at?: string; text: string }[] =>
  a.memos?.length ? a.memos : a.memo ? [{ text: a.memo }] : [];

/** 목록에 보여줄 가장 최근 메모 */
export const latestMemo = (a: HasMemo) => memoLog(a)[0]?.text;
