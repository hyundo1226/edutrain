import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home } from "@/components/edutrain/home";
import { EMPTY_GAMIFICATION } from "@/lib/gamification";
import type { Material, SessionRecord, Stats } from "@/types/quiz";

const stats: Stats = {
  cumulativeScore: 1240,
  streakDays: 5,
  lastStudyDate: "2026-07-23",
  bestCorrectStreak: 12,
};

const materials: Material[] = [
  { id: "m1", title: "파이썬 기초 정리", content: "본문1", createdAt: 1 },
  { id: "m2", title: "세포생물학 4장", content: "본문2", createdAt: 2 },
];

const sessions: SessionRecord[] = [
  { id: "s1", materialId: "m1", score: 400, total: 500, weakTags: [], completedAt: 1 },
  { id: "s2", materialId: "m2", score: 300, total: 500, weakTags: [], completedAt: 2 },
];

describe("Home", () => {
  it("[S5-1] 누적 점수가 표시된다", () => {
    render(
      <Home stats={stats} sessions={sessions} materials={materials} gamification={EMPTY_GAMIFICATION} onCreateNew={vi.fn()} onSelectMaterial={vi.fn()} />,
    );
    expect(screen.getByText("1240")).toBeInTheDocument();
  });

  it("[S5-2] 스트릭(연속 학습일 + 최고 연속 정답)이 둘 다 표시된다", () => {
    render(
      <Home stats={stats} sessions={sessions} materials={materials} gamification={EMPTY_GAMIFICATION} onCreateNew={vi.fn()} onSelectMaterial={vi.fn()} />,
    );
    expect(screen.getByText(/5일/)).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("[S5-3] 지난 세션들의 점수 목록(추이)이 표시된다", () => {
    render(
      <Home stats={stats} sessions={sessions} materials={materials} gamification={EMPTY_GAMIFICATION} onCreateNew={vi.fn()} onSelectMaterial={vi.fn()} />,
    );
    expect(screen.getByText("80%")).toBeInTheDocument(); // s1: 400/500
    expect(screen.getByText("60%")).toBeInTheDocument(); // s2: 300/500
    expect(screen.getAllByText("파이썬 기초 정리").length).toBeGreaterThan(0);
    expect(screen.getAllByText("세포생물학 4장").length).toBeGreaterThan(0);
  });

  it("[S5-4] 저장된 자료를 선택하면 onSelectMaterial이 그 자료로 호출된다", async () => {
    const onSelectMaterial = vi.fn();
    const user = userEvent.setup();
    render(
      <Home stats={stats} sessions={sessions} materials={materials} gamification={EMPTY_GAMIFICATION} onCreateNew={vi.fn()} onSelectMaterial={onSelectMaterial} />,
    );

    await user.click(screen.getByRole("button", { name: /파이썬 기초 정리/ }));
    expect(onSelectMaterial).toHaveBeenCalledWith(materials[0]);
  });
});
