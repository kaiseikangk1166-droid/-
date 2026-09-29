"use client";

import { useEffect, useState } from "react";
import Header, { type View } from "@/components/Header";
import PlayerForm from "@/components/PlayerForm";
import CoachDashboard from "@/components/CoachDashboard";
import { INITIAL_RECORDS, type ConditionRecord } from "@/lib/conditioning";

// ブラウザ内に記録を保存するためのキー
const STORAGE_KEY = "conditioning-records-v1";

export default function Home() {
  const [view, setView] = useState<View>("player");
  const [records, setRecords] = useState<ConditionRecord[]>(INITIAL_RECORDS);
  const [loaded, setLoaded] = useState(false);

  // 初回表示時に、ブラウザに保存済みの記録があれば読み込む
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setRecords(JSON.parse(saved));
    } catch {
      // 読み込めない場合は初期データのまま
    }
    setLoaded(true);
  }, []);

  // 記録が変わったらブラウザに保存
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // 保存できない環境では何もしない
    }
  }, [records, loaded]);

  const addRecord = (r: ConditionRecord) => setRecords((prev) => [r, ...prev]);
  const resetRecords = () => setRecords(INITIAL_RECORDS);

  return (
    <>
      <Header view={view} onChange={setView} />
      <main>
        {view === "player" ? (
          <PlayerForm onSubmit={addRecord} />
        ) : (
          <CoachDashboard records={records} onReset={resetRecords} />
        )}
      </main>
    </>
  );
}
