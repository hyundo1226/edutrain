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

/** prevDate(YYYY-MM-DD) 바로 다음 날이 today인지 (하루 공백 없이 이어지는지) */
function isNextDay(prevDate: string, today: string): boolean {
  if (!prevDate) return false;
  const prev = new Date(`${prevDate}T00:00:00`);
  const next = new Date(`${today}T00:00:00`);
  const diffDays = Math.round((next.getTime() - prev.getTime()) / 86_400_000);
  return diffDays === 1;
}

/**
 * 세트 완료 시 통계를 갱신한다.
 * - 오늘 이미 완료했으면 streakDays 불변 (S5-5)
 * - lastStudyDate 바로 다음 날이면 streakDays +1 (연속 학습)
 * - 그 외(하루 이상 공백, 최초 완료)에는 1로 리셋 — 며칠을 건너뛰어도 계속 증가하는 버그 방지
 * - bestCorrectStreak는 이번 세트의 최장 연속 정답과 기존 값 중 큰 값을 유지
 */
export function recordSessionStats(
  prev: Stats,
  params: { score: number; results: AnswerResult[]; today: string },
): Stats {
  const { score, results, today } = params;
  let streakDays: number;
  if (prev.lastStudyDate === today) {
    streakDays = prev.streakDays;
  } else if (isNextDay(prev.lastStudyDate, today)) {
    streakDays = prev.streakDays + 1;
  } else {
    streakDays = 1;
  }
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
