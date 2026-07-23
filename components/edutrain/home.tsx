"use client";

// 홈: 누적 점수·스트릭·지난 세션 이력·저장 자료 목록.
import { Button } from "@/components/ui/button";
import type { Material, SessionRecord, Stats } from "@/types/quiz";

export interface HomeProps {
  stats: Stats;
  sessions: SessionRecord[];
  materials: Material[];
  onCreateNew: () => void;
  onSelectMaterial: (material: Material) => void;
}

export function Home({
  stats,
  sessions,
  materials,
  onCreateNew,
  onSelectMaterial,
}: HomeProps) {
  const materialTitle = (id: string) =>
    materials.find((m) => m.id === id)?.title ?? "학습자료";

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="text-xl font-bold">EduTrain</div>
        <Button onClick={onCreateNew}>+ 새 세트 만들기</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-6 md:grid-cols-3">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">누적 점수</div>
          <div className="text-2xl font-bold">{stats.cumulativeScore}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">연속 학습일</div>
          <div className="text-2xl font-bold">{stats.streakDays}일</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">최고 연속 정답</div>
          <div className="text-2xl font-bold">{stats.bestCorrectStreak}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="font-bold mb-2 text-sm">저장된 자료</div>
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">저장된 자료가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {materials.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="w-full flex items-center justify-between rounded-lg border p-3 text-left"
                  onClick={() => onSelectMaterial(m)}
                >
                  <span>{m.title}</span>
                  <span className="text-xs text-muted-foreground">학습하기</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="font-bold mb-2 text-sm">지난 세션 (점수 추이)</div>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">완료한 세션이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...sessions].reverse().map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="text-sm">{materialTitle(s.materialId)}</span>
                  <span className="font-bold">
                    {s.total === 0 ? 0 : Math.round((s.score / s.total) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
