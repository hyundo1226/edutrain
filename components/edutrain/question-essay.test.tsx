import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionEssay } from "@/components/edutrain/question-essay";
import type { Question } from "@/types/quiz";

const essayQuestion: Question = {
  id: "q3",
  type: "essay",
  prompt: "list와 tuple의 차이를 가변성 관점에서 설명하시오.",
  tags: ["가변성"],
  difficulty: "medium",
  rubric: "가변/불변 차이를 언급하면 만점",
};

function mockFetchOnce(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(body),
    }),
  );
}

describe("QuestionEssay", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("[S3-2] 빈 답안으로 제출 → 안내 문구가 표시되고 채점이 호출되지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const onGraded = vi.fn();
    const user = userEvent.setup();
    render(<QuestionEssay question={essayQuestion} onGraded={onGraded} onNext={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "제출" }));

    expect(await screen.findByText("답안을 입력하세요")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onGraded).not.toHaveBeenCalled();
  });

  it("[S3-1] 답안 제출 성공 → 점수와 피드백이 표시되고 onGraded가 호출된다", async () => {
    mockFetchOnce({ score: 72, feedback: "핵심은 맞았으나 근거가 부족합니다." });
    const onGraded = vi.fn();
    const user = userEvent.setup();
    render(<QuestionEssay question={essayQuestion} onGraded={onGraded} onNext={vi.fn()} />);

    await user.type(screen.getByLabelText("답안"), "list는 값을 바꿀 수 있고 tuple은 못 바꾼다.");
    await user.click(screen.getByRole("button", { name: "제출" }));

    expect(await screen.findByText("72 / 100")).toBeInTheDocument();
    expect(screen.getByText("핵심은 맞았으나 근거가 부족합니다.")).toBeInTheDocument();
    expect(onGraded).toHaveBeenCalledWith(
      expect.objectContaining({ questionId: "q3", score: 72 }),
    );
  });

  it("[S3-3] 채점 실패 → 에러 안내 + '다시 채점' 버튼이 표시되고, 답안·진행은 유지된다", async () => {
    mockFetchOnce({ error: "채점에 실패했습니다" }, false);
    const onGraded = vi.fn();
    const user = userEvent.setup();
    render(<QuestionEssay question={essayQuestion} onGraded={onGraded} onNext={vi.fn()} />);

    const answerBox = screen.getByLabelText("답안");
    await user.type(answerBox, "list는 값을 바꿀 수 있고 tuple은 못 바꾼다.");
    await user.click(screen.getByRole("button", { name: "제출" }));

    expect(await screen.findByText("채점에 실패했습니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 채점" })).toBeInTheDocument();
    expect(onGraded).not.toHaveBeenCalled();
    // 답안 내용은 유지된다
    expect(answerBox).toHaveValue("list는 값을 바꿀 수 있고 tuple은 못 바꾼다.");

    // 재시도 → 성공하면 정상적으로 결과가 반영된다
    mockFetchOnce({ score: 90, feedback: "좋습니다." });
    await user.click(screen.getByRole("button", { name: "다시 채점" }));
    await waitFor(() => expect(onGraded).toHaveBeenCalledTimes(1));
  });

  it("점수 80점은 correct=true, 79점은 correct=false로 판정한다 (ESSAY_CORRECT_THRESHOLD 경계, 독립 리뷰에서 발견한 공백)", async () => {
    mockFetchOnce({ score: 80, feedback: "충분합니다." });
    const onGraded80 = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(
      <QuestionEssay question={essayQuestion} onGraded={onGraded80} onNext={vi.fn()} />,
    );
    await user.type(screen.getByLabelText("답안"), "답안");
    await user.click(screen.getByRole("button", { name: "제출" }));
    await waitFor(() => expect(onGraded80).toHaveBeenCalledWith(expect.objectContaining({ score: 80, correct: true })));
    unmount();

    mockFetchOnce({ score: 79, feedback: "조금 부족합니다." });
    const onGraded79 = vi.fn();
    render(<QuestionEssay question={essayQuestion} onGraded={onGraded79} onNext={vi.fn()} />);
    await user.type(screen.getByLabelText("답안"), "답안");
    await user.click(screen.getByRole("button", { name: "제출" }));
    await waitFor(() => expect(onGraded79).toHaveBeenCalledWith(expect.objectContaining({ score: 79, correct: false })));
  });
});
