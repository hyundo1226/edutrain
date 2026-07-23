import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionObjective } from "@/components/edutrain/question-objective";
import type { Question } from "@/types/quiz";

const mcQuestion: Question = {
  id: "q1",
  type: "mc",
  prompt: "Python에서 순서가 있고 변경 가능한 자료형은?",
  tags: ["자료형"],
  difficulty: "medium",
  choices: ["tuple", "list", "set", "frozenset"],
  answer: "list",
  explanation: "list는 순서가 있고 원소를 바꿀 수 있다.",
};

function setup(question = mcQuestion) {
  const onGraded = vi.fn();
  const onNext = vi.fn();
  const user = userEvent.setup();
  render(
    <QuestionObjective question={question} onGraded={onGraded} onNext={onNext} />,
  );
  return { onGraded, onNext, user };
}

describe("QuestionObjective", () => {
  it('[S2-1] 정답 선택 후 제출 → "정답" 표시 + 해설 + 다음 문항 이동 수단이 나타난다', async () => {
    const { onGraded, onNext, user } = setup();

    await user.click(screen.getByRole("radio", { name: "list" }));
    await user.click(screen.getByRole("button", { name: "제출" }));

    expect(screen.getByText("정답")).toBeInTheDocument();
    expect(screen.getByText(/list는 순서가 있고/)).toBeInTheDocument();
    expect(onGraded).toHaveBeenCalledWith(
      expect.objectContaining({ questionId: "q1", correct: true }),
    );

    const nextBtn = screen.getByRole("button", { name: "다음 문항 →" });
    await user.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('[S2-2] 오답 선택 후 제출 → "오답" + 정답 보기 + 해설이 나타난다', async () => {
    const { onGraded, user } = setup();

    await user.click(screen.getByRole("radio", { name: "set" }));
    await user.click(screen.getByRole("button", { name: "제출" }));

    expect(screen.getByText("오답")).toBeInTheDocument();
    expect(screen.getByText("정답: list")).toBeInTheDocument();
    expect(screen.getByText(/list는 순서가 있고/)).toBeInTheDocument();
    expect(onGraded).toHaveBeenCalledWith(
      expect.objectContaining({ questionId: "q1", correct: false }),
    );
  });

  it("[S2-4] 제출 후에는 같은 문항의 답을 다시 바꿀 수 없다", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("radio", { name: "list" }));
    await user.click(screen.getByRole("button", { name: "제출" }));

    // 제출 버튼이 사라지고, 보기는 비활성화되어 값이 바뀌지 않는다.
    expect(screen.queryByRole("button", { name: "제출" })).not.toBeInTheDocument();
    const otherOption = screen.getByRole("radio", { name: "tuple" });
    expect(otherOption).toBeDisabled();
    await user.click(otherOption);
    expect(screen.getByRole("radio", { name: /^list/ })).toBeChecked();
  });
});
