export type View = "player" | "coach";

type Props = {
  view: View;
  onChange: (v: View) => void;
};

const TABS: { key: View; label: string; short: string }[] = [
  { key: "player", label: "選手用入力フォーム", short: "選手入力" },
  { key: "coach", label: "コーチ用ダッシュボード", short: "コーチ" },
];

// 画面上部のヘッダー（画面切替タブ）
export default function Header({ view, onChange }: Props) {
  return (
    <header className="sticky top-0 z-20 bg-ink text-white shadow-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-lg" aria-hidden>
            🏈
          </span>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold tracking-widest text-white/60">FOOTBALL CONDITIONING</p>
            <h1 className="text-base font-bold">コンディション管理</h1>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-1 rounded-lg bg-white/10 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                view === t.key ? "bg-brand text-white shadow" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              aria-pressed={view === t.key}
            >
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
