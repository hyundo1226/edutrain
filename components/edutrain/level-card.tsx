"use client";

// 레벨 카드: 누적 점수(이 기능 도입 이후) → 레벨 + 다음 레벨까지 진행률.
import { Progress } from "@/components/ui/progress";
import { levelProgress } from "@/lib/gamification";

export interface LevelCardProps {
  levelScore: number;
}

export function LevelCard({ levelScore }: LevelCardProps) {
  const { level, into, span } = levelProgress(levelScore);
  const percentage = Math.round((into / span) * 100);

  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">레벨 {level}</div>
      <Progress value={percentage} className="mt-2" />
      <div className="mt-1 text-xs text-muted-foreground">
        {into} / {span}
      </div>
    </div>
  );
}
