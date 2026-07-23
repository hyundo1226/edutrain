import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultView } from "@/components/edutrain/result-view";
import type { AnswerResult, QuizSet } from "@/types/quiz";

function mkQuizSet(): QuizSet {
  return {
    id: "set1",
    materialId: "m1",
    createdAt: 1,
    questions: [
      { id: "q1", type: "mc", prompt: "P1", tags: ["A"], difficulty: "medium", choices: ["x"], answer: "x" },
      { id: "q2", type: "mc", prompt: "P2", tags: ["B"], difficulty: "medium", choices: ["x"], answer: "x" },
      { id: "q3", type: "mc", prompt: "P3", tags: ["C"], difficulty: "medium", choices: ["x"], answer: "x" },
      { id: "q4", type: "mc", prompt: "P4", tags: ["D"], difficulty: "medium", choices: ["x"], answer: "x" },
      { id: "q5", type: "mc", prompt: "P5", tags: ["E"], difficulty: "medium", choices: ["x"], answer: "x" },
    ],
  };
}

function r(questionId: string, correct: boolean): AnswerResult {
  return { questionId, given: "g", correct, score: correct ? 100 : 0 };
}

describe("ResultView", () => {
  it("[S4-1] 세트 점수(정답 수/전체·백분율)가 표시된다", () => {
    const results = [r("q1", true), r("q2", true), r("q3", true), r("q4", true), r("q5", false)];
    render(
      <ResultView
        quizSet={mkQuizSet()}
        results={results}
        hasActiveWeakTags
        onRetryWeak={vi.fn()}
        onHome={vi.fn()}
      />,
    );

    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText(/4 \/ 5 정답/)).toBeInTheDocument();
  });

  it("[S4-2] 틀린 문항의 주제 태그가 약점 주제로 묶여 표시된다", () => {
    const results = [r("q1", true), r("q2", true), r("q3", true), r("q4", false), r("q5", false)];
    render(
      <ResultView
        quizSet={mkQuizSet()}
        results={results}
        hasActiveWeakTags
        onRetryWeak={vi.fn()}
        onHome={vi.fn()}
      />,
    );

    expect(screen.getByText("약점 주제")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.queryByText("A")).not.toBeInTheDocument();
  });

  it("[S4-3] 점수가 80% 이상이면 텍스트 추천이 표시된다", () => {
    const results = [r("q1", true), r("q2", true), r("q3", true), r("q4", true), r("q5", false)];
    render(
      <ResultView
        quizSet={mkQuizSet()}
        results={results}
        hasActiveWeakTags
        onRetryWeak={vi.fn()}
        onHome={vi.fn()}
      />,
    );

    expect(screen.getByText(/주제를 심화 학습해보세요/)).toBeInTheDocument();
  });

  it("[S4-3] 점수가 80% 미만이면 텍스트 추천이 표시되지 않는다", () => {
    const results = [r("q1", true), r("q2", true), r("q3", false), r("q4", false), r("q5", false)];
    render(
      <ResultView
        quizSet={mkQuizSet()}
        results={results}
        hasActiveWeakTags
        onRetryWeak={vi.fn()}
        onHome={vi.fn()}
      />,
    );

    expect(screen.queryByText(/주제를 심화 학습해보세요/)).not.toBeInTheDocument();
  });

  it('[S4-4] "약점만 다시 풀기"를 누르면 onRetryWeak이 호출된다', async () => {
    const onRetryWeak = vi.fn();
    const results = [r("q1", true), r("q2", true), r("q3", true), r("q4", false), r("q5", false)];
    const user = userEvent.setup();
    render(
      <ResultView
        quizSet={mkQuizSet()}
        results={results}
        hasActiveWeakTags
        onRetryWeak={onRetryWeak}
        onHome={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "약점만 다시 풀기" }));
    expect(onRetryWeak).toHaveBeenCalledTimes(1);
  });

  it('[S4-4] hasActiveWeakTags가 false면 이번 세션 약점 태그가 표시돼도 "약점만 다시 풀기"는 비활성화된다 (독립 리뷰에서 발견한 불일치 방지)', () => {
    // 이번 세션에서는 틀린 문항이 있어 로컬 약점 태그가 보이지만,
    // 전역 누적 약점(hasActiveWeakTags)이 없으면(예: 다른 문항에서 이미 만회) 버튼은 비활성화되어야
    // "버튼은 켜졌는데 다음 화면(약점 세트)엔 태그가 없는" 불일치가 생기지 않는다.
    const results = [r("q1", true), r("q2", true), r("q3", true), r("q4", false), r("q5", false)];
    render(
      <ResultView
        quizSet={mkQuizSet()}
        results={results}
        hasActiveWeakTags={false}
        onRetryWeak={vi.fn()}
        onHome={vi.fn()}
      />,
    );

    expect(screen.getByText("D")).toBeInTheDocument(); // 로컬 약점 태그는 여전히 표시(S4-2)
    expect(screen.getByRole("button", { name: "약점만 다시 풀기" })).toBeDisabled();
  });
});
