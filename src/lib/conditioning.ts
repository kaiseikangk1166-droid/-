// コンディション記録の型・判定ロジック・初期データ

export type Status = "green" | "yellow" | "red";

export type ConditionRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  fatigue: number; // 1〜10
  sleep: number; // 時間（0.5刻み）
  meals: number; // 0〜5（5は「5回以上」）
  pains: string[]; // 「なし」または部位名
};

// 選手一覧
export const PLAYERS = ["山田 太郎", "佐藤 健太", "鈴木 大輔", "田中 翔", "高橋 陸", "伊藤 翼"];

// 痛み・違和感の選択肢
export const PAIN_OPTIONS = ["なし", "首", "肩", "腰", "股関節", "膝", "足首", "その他"];

// チーム全体の人数（サマリー表示用）
export const TEAM_SIZE = 80;

// 痛みがあるか（「なし」以外が1つでも含まれていれば痛みあり）
export function hasPain(pains: string[]): boolean {
  return pains.some((p) => p !== "なし");
}

// ステータス判定
// 赤：疲労度8以上 OR 睡眠5時間未満 OR 痛みあり
// 黄：上記以外で、疲労度6〜7 OR 睡眠5〜6時間
// 緑：上記以外
export function judgeStatus(r: Pick<ConditionRecord, "fatigue" | "sleep" | "pains">): Status {
  if (r.fatigue >= 8 || r.sleep < 5 || hasPain(r.pains)) return "red";
  if ((r.fatigue >= 6 && r.fatigue <= 7) || (r.sleep >= 5 && r.sleep <= 6)) return "yellow";
  return "green";
}

// ステータスごとの表示設定
export const STATUS_STYLE: Record<Status, { label: string; rowBg: string; badge: string; message: string }> = {
  green: {
    label: "良好",
    rowBg: "#ECFDF5",
    badge: "bg-emerald-500 text-white",
    message: "良いコンディションです！今日の練習も頑張りましょう。",
  },
  yellow: {
    label: "注意",
    rowBg: "#FEF3C7",
    badge: "bg-amber-400 text-[#2f1e1e]",
    message: "睡眠時間が不足気味です。練習後のリカバリーを念入りに。",
  },
  red: {
    label: "警告",
    rowBg: "#FEE2E2",
    badge: "bg-[#ef3434] text-white",
    message: "疲労が溜まっています（または痛みがあります）。練習前にS&Cコーチやトレーナーに相談してください。",
  },
};

// 今日の日付（端末のローカル時間で YYYY-MM-DD）
export function todayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// 初期ダミーデータ
export const INITIAL_RECORDS: ConditionRecord[] = [
  { id: "seed-1", date: "2026-05-23", name: "山田 太郎", fatigue: 3, sleep: 7.5, meals: 3, pains: ["なし"] },
  { id: "seed-2", date: "2026-05-23", name: "佐藤 健太", fatigue: 8, sleep: 6.0, meals: 3, pains: ["なし"] },
  { id: "seed-3", date: "2026-05-23", name: "鈴木 大輔", fatigue: 5, sleep: 4.5, meals: 2, pains: ["なし"] },
  { id: "seed-4", date: "2026-05-23", name: "田中 翔", fatigue: 4, sleep: 7.0, meals: 3, pains: ["右膝"] },
  { id: "seed-5", date: "2026-05-23", name: "高橋 陸", fatigue: 6, sleep: 5.5, meals: 2, pains: ["なし"] },
  { id: "seed-6", date: "2026-05-23", name: "伊藤 翼", fatigue: 2, sleep: 8.0, meals: 4, pains: ["なし"] },
];
