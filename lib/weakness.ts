// 약점 태그 집계. 의존성: types.
import type { AnswerResult, Question, WeaknessEntry } from "@/types/quiz";

/** 이번 세트에서 틀린 문항들의 주제 태그 집합 (S4-2 약점 주제) */
export function weakTagsFromResults(
  questions: Question[],
  results: AnswerResult[],
): string[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const tags = new Set<string>();
  for (const r of results) {
    if (r.correct) continue;
    const q = byId.get(r.questionId);
    q?.tags.forEach((t) => tags.add(t));
  }
  return [...tags];
}

/**
 * 세트 결과를 반영해 약점 목록을 갱신한다.
 * - 틀린 문항의 태그: wrongCount +1, mastered=false
 * - 맞힌 문항의 태그: wrongCount -1 (0이면 mastered=true로 완화) (S6-2)
 */
export function updateWeaknesses(
  prev: WeaknessEntry[],
  questions: Question[],
  results: AnswerResult[],
): WeaknessEntry[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const map = new Map(prev.map((e) => [e.tag, { ...e }]));

  const ensure = (tag: string): WeaknessEntry => {
    let e = map.get(tag);
    if (!e) {
      e = { tag, wrongCount: 0, mastered: false };
      map.set(tag, e);
    }
    return e;
  };

  for (const r of results) {
    const q = byId.get(r.questionId);
    if (!q) continue;
    for (const tag of q.tags) {
      const e = ensure(tag);
      if (r.correct) {
        e.wrongCount = Math.max(0, e.wrongCount - 1);
        if (e.wrongCount === 0) e.mastered = true;
      } else {
        e.wrongCount += 1;
        e.mastered = false;
      }
    }
  }

  return [...map.values()];
}

/** 아직 약점인(오답 기록이 남고 mastered 아닌) 태그 목록 */
export function activeWeakTags(entries: WeaknessEntry[]): string[] {
  return entries
    .filter((e) => !e.mastered && e.wrongCount > 0)
    .map((e) => e.tag);
}
