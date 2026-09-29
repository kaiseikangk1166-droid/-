"use client";

import { useState } from "react";
import {
  PAIN_OPTIONS,
  PLAYERS,
  STATUS_STYLE,
  judgeStatus,
  todayString,
  type ConditionRecord,
  type Status,
} from "@/lib/conditioning";

type Props = {
  onSubmit: (r: ConditionRecord) => void;
};

// フィードバックカードの色設定
const FEEDBACK_STYLE: Record<Status, { box: string; icon: string; title: string }> = {
  green: { box: "border-emerald-500 bg-emerald-50", icon: "✅", title: "良好" },
  yellow: { box: "border-amber-400 bg-amber-50", icon: "⚠️", title: "注意" },
  red: { box: "border-[#ef3434] bg-red-50", icon: "🚨", title: "警告" },
};

// 選手用コンディション入力フォーム（スマホ最適化）
export default function PlayerForm({ onSubmit }: Props) {
  const [name, setName] = useState("");
  const [pains, setPains] = useState<string[]>(["なし"]);
  const [fatigue, setFatigue] = useState(5);
  const [sleep, setSleep] = useState("7.0");
  const [meals, setMeals] = useState("3");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ status: Status; name: string } | null>(null);

  // 痛みチェックボックスの切替（「なし」と部位は同時に選べない）
  const togglePain = (p: string) => {
    setPains((prev) => {
      if (p === "なし") return ["なし"];
      const withoutNone = prev.filter((x) => x !== "なし");
      const next = withoutNone.includes(p) ? withoutNone.filter((x) => x !== p) : [...withoutNone, p];
      return next.length === 0 ? ["なし"] : next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sleepNum = Number(sleep);
    const mealsNum = Number(meals);

    // 入力チェック
    if (!name) return setError("氏名を選択してください。");
    if (sleep === "" || isNaN(sleepNum) || sleepNum < 0 || sleepNum > 24 || (sleepNum * 2) % 1 !== 0)
      return setError("睡眠時間は0.0〜24.0の範囲で、0.5時間単位で入力してください。");
    if (meals === "" || !Number.isInteger(mealsNum) || mealsNum < 0 || mealsNum > 5)
      return setError("食事回数を選択してください。");

    const record: ConditionRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: todayString(),
      name,
      fatigue,
      sleep: sleepNum,
      meals: mealsNum,
      pains,
    };
    onSubmit(record);
    setError("");
    setResult({ status: judgeStatus(record), name });
    // 送信後は画面上部のフィードバックが見えるようにスクロール
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 送信完了後のフィードバック表示
  if (result) {
    const fb = FEEDBACK_STYLE[result.status];
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <div className={`rounded-2xl border-l-8 p-6 shadow-sm ${fb.box}`}>
          <p className="text-4xl" aria-hidden>
            {fb.icon}
          </p>
          <p className="mt-3 text-sm font-semibold text-zinc-500">{result.name} さん・送信完了</p>
          <h2 className="mt-1 text-2xl font-extrabold">【{fb.title}】</h2>
          <p className="mt-3 text-base leading-relaxed">{STATUS_STYLE[result.status].message}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setName("");
            setPains(["なし"]);
            setFatigue(5);
            setSleep("7.0");
            setMeals("3");
          }}
          className="mt-6 w-full rounded-xl border-2 border-ink bg-white py-3 font-bold text-ink active:scale-[0.99]"
        >
          もう一度入力する
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4 px-4 py-6">
      <div>
        <h2 className="text-xl font-extrabold">今日のコンディション</h2>
        <p className="text-sm text-zinc-500">{todayString()} の体調を入力してください</p>
      </div>

      {/* 氏名 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <label htmlFor="name" className="mb-2 block text-sm font-bold">
          氏名 <span className="text-brand">*</span>
        </label>
        <select
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">選択してください</option>
          {PLAYERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </section>

      {/* 痛み・張り・違和感 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-bold">身体の痛み・張り・違和感（複数選択可）</p>
        <div className="grid grid-cols-4 gap-2">
          {PAIN_OPTIONS.map((p) => {
            const checked = pains.includes(p);
            return (
              <label
                key={p}
                className={`flex cursor-pointer items-center justify-center rounded-lg border-2 px-1 py-2.5 text-sm font-bold transition select-none ${
                  checked
                    ? p === "なし"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-brand bg-red-50 text-brand"
                    : "border-zinc-200 text-zinc-600"
                }`}
              >
                <input type="checkbox" className="sr-only" checked={checked} onChange={() => togglePain(p)} />
                {p}
              </label>
            );
          })}
        </div>
      </section>

      {/* 主観的疲労度 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="fatigue" className="text-sm font-bold">
            主観的疲労度
          </label>
          <span
            className={`text-3xl font-extrabold ${
              fatigue >= 8 ? "text-brand" : fatigue >= 6 ? "text-amber-500" : "text-emerald-600"
            }`}
          >
            {fatigue}
            <span className="text-sm text-zinc-400"> / 10</span>
          </span>
        </div>
        <input
          id="fatigue"
          type="range"
          min={1}
          max={10}
          step={1}
          value={fatigue}
          onChange={(e) => setFatigue(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-[#ef3434]"
        />
        <div className="mt-1 flex justify-between text-xs text-zinc-500">
          <span>1：良好</span>
          <span>10：限界</span>
        </div>
      </section>

      {/* 睡眠時間・食事回数 */}
      <section className="grid grid-cols-2 gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <label htmlFor="sleep" className="mb-2 block text-sm font-bold">
            睡眠時間
          </label>
          <div className="flex items-center gap-1">
            <input
              id="sleep"
              type="number"
              inputMode="decimal"
              min={0}
              max={24}
              step={0.5}
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <span className="text-sm text-zinc-500">時間</span>
          </div>
        </div>
        <div>
          <label htmlFor="meals" className="mb-2 block text-sm font-bold">
            食事回数
          </label>
          <select
            id="meals"
            value={meals}
            onChange={(e) => setMeals(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n === 5 ? "5回以上" : `${n}回`}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-brand">{error}</p>}

      <button
        type="submit"
        className="w-full rounded-xl bg-brand py-4 text-lg font-extrabold text-white shadow-lg shadow-red-500/30 transition hover:brightness-95 active:scale-[0.99]"
      >
        送信
      </button>
    </form>
  );
}
