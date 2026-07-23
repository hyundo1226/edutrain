// 세트 점수 집계. 의존성: types.
import type { AnswerResult } from "@/types/quiz";

export interface SetScore {
  score: number; // 획득 점수 합 (문항별 0~100 합산)
  total: number; // 만점 (문항 수 * 100)
  percentage: number; // 0~100 백분율 (반올림)
  correctCount: number; // 정답 처리된 문항 수
  count: number; // 전체 문항 수
}

/** 문항별 채점 결과를 세트 점수로 집계한다. 서술형 부분점수도 반영된다. */
export function scoreSet(results: AnswerResult[]): SetScore {
  const count = results.length;
  const total = count * 100;
  const score = results.reduce((sum, r) => sum + r.score, 0);
  const percentage = total === 0 ? 0 : Math.round((score / total) * 100);
  const correctCount = results.filter((r) => r.correct).length;
  return { score, total, percentage, correctCount, count };
}
