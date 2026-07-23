import { describe, it, expect } from "vitest";
import {
  EMPTY_STATS,
  longestCorrectStreak,
  recordSessionStats,
  cumulativeScoreFromSessions,
} from "@/lib/stats";
import type { AnswerResult, SessionRecord } from "@/types/quiz";

function r(correct: boolean): AnswerResult {
  return { questionId: "q", given: "g", correct, score: correct ? 100 : 0 };
}

describe("recordSessionStats", () => {
  it("[S5-5] 오늘 첫 세트 완료 → 연속 학습일이 1 증가한다", () => {
    const next = recordSessionStats(
      { ...EMPTY_STATS, lastStudyDate: "2026-07-22", streakDays: 3 },
      { score: 300, results: [r(true), r(true)], today: "2026-07-23" },
    );
    expect(next.streakDays).toBe(4);
    expect(next.lastStudyDate).toBe("2026-07-23");
  });

  it("[S5-5] 같은 날 추가 완료는 연속 학습일을 증가시키지 않는다", () => {
    const next = recordSessionStats(
      { ...EMPTY_STATS, lastStudyDate: "2026-07-23", streakDays: 4 },
      { score: 200, results: [r(true)], today: "2026-07-23" },
    );
    expect(next.streakDays).toBe(4);
  });

  it("누적 점수를 더하고 최고 연속 정답을 갱신한다", () => {
    const next = recordSessionStats(
      { ...EMPTY_STATS, cumulativeScore: 500, bestCorrectStreak: 2 },
      { score: 300, results: [r(true), r(true), r(true), r(false)], today: "2026-07-23" },
    );
    expect(next.cumulativeScore).toBe(800);
    expect(next.bestCorrectStreak).toBe(3);
  });
});

describe("longestCorrectStreak", () => {
  it("가장 긴 연속 정답 길이를 구한다", () => {
    expect(longestCorrectStreak([r(true), r(false), r(true), r(true), r(true)])).toBe(3);
    expect(longestCorrectStreak([r(false), r(false)])).toBe(0);
  });
});

describe("cumulativeScoreFromSessions", () => {
  it("[INV-3] 세션 이력의 점수 합이 누적 점수와 같다", () => {
    const sessions: SessionRecord[] = [
      { id: "1", materialId: "m", score: 300, total: 400, weakTags: [], completedAt: 1 },
      { id: "2", materialId: "m", score: 200, total: 400, weakTags: [], completedAt: 2 },
    ];
    // 저장된 이력에서 재계산한 값과, 세션마다 recordSessionStats로 누적한 값이 일치해야 한다.
    let stats = EMPTY_STATS;
    stats = recordSessionStats(stats, { score: 300, results: [], today: "2026-07-22" });
    stats = recordSessionStats(stats, { score: 200, results: [], today: "2026-07-23" });
    expect(stats.cumulativeScore).toBe(cumulativeScoreFromSessions(sessions));
  });
});
