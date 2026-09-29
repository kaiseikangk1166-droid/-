"use client";

import { useMemo, useState } from "react";
import { STATUS_STYLE, TEAM_SIZE, judgeStatus, type ConditionRecord } from "@/lib/conditioning";

type Props = {
  records: ConditionRecord[];
  onReset: () => void;
};

type SortOrder = "none" | "desc" | "asc";

// コーチ用管理ダッシュボード（PC大画面最適化）
export default function CoachDashboard({ records, onReset }: Props) {
  const [redOnly, setRedOnly] = useState(false);
  const [sort, setSort] = useState<SortOrder>("none");

  // 各記録にステータスを付与
  const rows = useMemo(() => records.map((r) => ({ ...r, status: judgeStatus(r) })), [records]);

  // サマリーの対象日＝記録のある最新日（通常は本日）
  const latestDate = useMemo(() => rows.reduce((max, r) => (r.date > max ? r.date : max), ""), [rows]);
  const latestRows = rows.filter((r) => r.date === latestDate);
  // 同じ選手が複数回入力した場合は1名として数える
  const inputCount = new Set(latestRows.map((r) => r.name)).size;
  const redCount = new Set(latestRows.filter((r) => r.status === "red").map((r) => r.name)).size;

  // フィルター・ソート適用
  const visibleRows = useMemo(() => {
    const list = redOnly ? rows.filter((r) => r.status === "red") : [...rows];
    if (sort === "desc") list.sort((a, b) => b.fatigue - a.fatigue);
    if (sort === "asc") list.sort((a, b) => a.fatigue - b.fatigue);
    return list;
  }, [rows, redOnly, sort]);

  const toggleSort = () => setSort((s) => (s === "desc" ? "asc" : s === "asc" ? "none" : "desc"));
  const sortIcon = sort === "desc" ? "▼" : sort === "asc" ? "▲" : "⇅";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-extrabold">チームコンディション</h2>
          <p className="text-sm text-zinc-500">集計日：{latestDate || "記録なし"}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("入力データを初期状態（ダミーデータ）に戻します。よろしいですか？")) onReset();
          }}
          className="text-xs text-zinc-400 underline hover:text-zinc-600"
        >
          データを初期状態に戻す
        </button>
      </div>

      {/* サマリーエリア */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border-t-4 border-ink bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-zinc-500">本日の入力者数</p>
          <p className="mt-2 text-5xl font-extrabold">
            {inputCount}
            <span className="text-2xl text-zinc-400"> / {TEAM_SIZE}名</span>
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-ink"
              style={{ width: `${Math.min(100, (inputCount / TEAM_SIZE) * 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border-t-4 border-brand bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-zinc-500">要注意（赤）人数</p>
          <p className="mt-2 text-6xl font-extrabold text-brand">
            {redCount}
            <span className="text-2xl"> 名</span>
          </p>
          <p className="mt-2 text-sm text-zinc-500">練習前にS&amp;Cコーチ・トレーナーの確認が必要です</p>
        </div>
      </section>

      {/* コンディション一覧 */}
      <section className="rounded-2xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-4">
          <h3 className="text-lg font-bold">コンディション一覧</h3>
          <div className="flex flex-wrap items-center gap-4">
            {/* 要注意のみ表示トグル */}
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold select-none">
              <span>要注意（赤）のみ表示</span>
              <button
                type="button"
                role="switch"
                aria-checked={redOnly}
                onClick={() => setRedOnly((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition ${redOnly ? "bg-brand" : "bg-zinc-300"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    redOnly ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </label>
            {/* 疲労度ソート */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOrder)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm"
              aria-label="並び替え"
            >
              <option value="none">並び順：入力順</option>
              <option value="desc">疲労度：高い順</option>
              <option value="asc">疲労度：低い順</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3">日付</th>
                <th className="px-4 py-3">氏名</th>
                <th className="px-4 py-3">
                  <button type="button" onClick={toggleSort} className="font-bold hover:text-brand">
                    疲労度 {sortIcon}
                  </button>
                </th>
                <th className="px-4 py-3">睡眠時間</th>
                <th className="px-4 py-3">食事回数</th>
                <th className="px-4 py-3">痛み・違和感</th>
                <th className="px-4 py-3">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const st = STATUS_STYLE[r.status];
                return (
                  <tr
                    key={r.id}
                    style={{ backgroundColor: st.rowBg }}
                    className="border-t border-white text-base"
                  >
                    <td className="px-4 py-3 text-sm text-zinc-600">{r.date}</td>
                    <td className="px-4 py-3 font-bold">{r.name}</td>
                    <td className={`px-4 py-3 font-bold ${r.fatigue >= 8 ? "text-brand" : ""}`}>{r.fatigue}</td>
                    <td className={`px-4 py-3 ${r.sleep < 5 ? "font-bold text-brand" : ""}`}>
                      {r.sleep.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3">{r.meals >= 5 ? "5回以上" : `${r.meals}回`}</td>
                    <td className={`px-4 py-3 ${r.pains.some((p) => p !== "なし") ? "font-bold text-brand" : ""}`}>
                      {r.pains.join("・")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${st.badge}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                    該当するデータはありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
