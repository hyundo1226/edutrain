import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeakSetPreview } from "@/components/edutrain/weak-set-preview";
import type { Material } from "@/types/quiz";

const material: Material = {
  id: "m1",
  title: "파이썬 기초",
  content: "본문",
  createdAt: 1,
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

describe("WeakSetPreview", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("약점 주제 태그 목록을 표시한다", () => {
    render(
      <WeakSetPreview material={material} weakTags={["자료형", "가변성"]} onStart={vi.fn()} />,
    );

    expect(screen.getByText("자료형")).toBeInTheDocument();
    expect(screen.getByText("가변성")).toBeInTheDocument();
  });

  it('[S4-4] "시작"을 누르면 약점 태그로 /api/generate를 호출하고 onStart가 생성된 세트로 호출된다', async () => {
    mockFetchOnce({
      questions: [
        { id: "1", type: "mc", prompt: "P", tags: ["자료형"], difficulty: "medium", choices: ["a"], answer: "a" },
      ],
    });
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(
      <WeakSetPreview material={material} weakTags={["자료형", "가변성"]} onStart={onStart} />,
    );

    await user.click(screen.getByRole("button", { name: "시작" }));

    await waitFor(() => expect(onStart).toHaveBeenCalledTimes(1));
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.weakTags).toEqual(["자료형", "가변성"]);
    expect(body.material).toBe("본문");

    const [calledMaterial, quizSet] = onStart.mock.calls[0];
    expect(calledMaterial).toEqual(material);
    expect(quizSet.questions).toHaveLength(1);
    expect(quizSet.materialId).toBe("m1");
  });

  it("생성 실패 → 에러 안내와 '다시 시도' 버튼이 표시된다", async () => {
    mockFetchOnce({ error: "세트 생성에 실패했습니다" }, false);
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(
      <WeakSetPreview material={material} weakTags={["자료형"]} onStart={onStart} />,
    );

    await user.click(screen.getByRole("button", { name: "시작" }));

    expect(await screen.findByText("세트 생성에 실패했습니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });
});
