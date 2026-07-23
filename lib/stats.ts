// 누적 점수·스트릭 계산. 의존성: types.
import type { AnswerResult, SessionRecord, Stats } from "@/types/quiz";

export const EMPTY_STATS: Stats = {
  cumulativeScore: 0,
  streakDays: 0,
  lastStudyDate: "",
  bestCorrectStreak: 0,
};

/** 채점 결과 배열에서 가장 긴 연속 정답 구간의 길이를 구한다. */
export function longestCorrectStreak(results: AnswerResult[]): number {
  let best = 0;
  let current = 0;
  for (const r of results) {
    if (r.correct) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

/**
 * 세트 완료 시 통계를 갱신한다.
 * - lastStudyDate가 오늘이 아니면 streakDays +1 (오늘 첫 완료), 이미 오늘이면 불변 (S5-5)
 * - bestCorrectStreak는 이번 세트의 최장 연속 정답과 기존 값 중 큰 값을 유지
 */
export function recordSessionStats(
  prev: Stats,
  params: { score: number; results: AnswerResult[]; today: string },
): Stats {
  const { score, results, today } = params;
  const streakDays =
    prev.lastStudyDate === today ? prev.streakDays : prev.streakDays + 1;
  const sessionBest = longestCorrectStreak(results);
  return {
    cumulativeScore: prev.cumulativeScore + score,
    streakDays,
    lastStudyDate: today,
    bestCorrectStreak: Math.max(prev.bestCorrectStreak, sessionBest),
  };
}

/** 세션 이력에서 누적 점수를 재계산한다. 표시값과 저장 이력의 일치를 검증하는 데 쓰인다 (INV-3). */
export function cumulativeScoreFromSessions(sessions: SessionRecord[]): number {
  return sessions.reduce((sum, s) => sum + s.score, 0);
}
