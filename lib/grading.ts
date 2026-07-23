// 결정적 채점 (객관식·단답). LLM 불필요·즉시·무료. 의존성: types.
import type { AnswerResult, Question } from "@/types/quiz";

/** 단답 비교용 정규화: 앞뒤 공백 제거 + 소문자 + 내부 공백 축약 */
export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * 객관식·단답 문항을 결정적으로 채점한다.
 * - mc: 선택한 보기와 정답 보기를 정규화 후 비교. Gemini가 생성한 answer 문자열이
 *   choices 중 하나와 완전 동일하지 않을 수 있어(공백 등) 정확 일치(===)만 쓰면
 *   정답을 골라도 항상 오답 처리되는 버그가 생긴다.
 * - short: 정규화(대소문자·공백 무시) 후 일치하면 정답 (S2-3)
 */
export function gradeObjective(question: Question, given: string): AnswerResult {
  const correct =
    normalizeAnswer(given) === normalizeAnswer(question.answer ?? "");
  return {
    questionId: question.id,
    given,
    correct,
    score: correct ? 100 : 0,
  };
}
