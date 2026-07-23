"use client";

// 관심사 배지: 태그별 학습 횟수가 임계값을 넘으면 배지로 표시. 별도 저장 없이 매번 파생.
import { Badge } from "@/components/ui/badge";
import { deriveBadges } from "@/lib/gamification";

export interface BadgeListProps {
  tagCounts: Record<string, number>;
}

export function BadgeList({ tagCounts }: BadgeListProps) {
  const badges = deriveBadges(tagCounts);

  if (badges.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">아직 획득한 배지가 없습니다</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((tag) => (
        <Badge key={tag}>🏅 {tag}</Badge>
      ))}
    </div>
  );
}
