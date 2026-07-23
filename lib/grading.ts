// 결정적 채점 (객관식·단답). LLM 불필요·즉시·무료. 의존성: types.
import type { AnswerResult, Question } from "@/types/quiz";

/** 단답 비교용 정규화: 앞뒤 공백 제거 + 소문자 + 내부 공백 축약 */
export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * 객관식·단답 문항을 결정적으로 채점한다.
 * - mc: 선택한 보기가 정답 보기와 정확히 일치해야 정답
 * - short: 정규화(대소문자·공백 무시) 후 일치하면 정답 (S2-3)
 */
export function gradeObjective(question: Question, given: string): AnswerResult {
  let correct: boolean;
  if (question.type === "short") {
    correct = normalizeAnswer(given) === normalizeAnswer(question.answer ?? "");
  } else {
    // mc: 보기 문자열 정확 일치
    correct = given === question.answer;
  }
  return {
    questionId: question.id,
    given,
    correct,
    score: correct ? 100 : 0,
  };
}
