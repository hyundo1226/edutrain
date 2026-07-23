import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateSet } from "@/components/edutrain/create-set";
import { loadMaterials } from "@/lib/storage";
import type { Material } from "@/types/quiz";

function mockFetchOnce(body: unknown, ok = true, status = ok ? 200 : 500) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({
      ok,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

const FIVE_MC_QUESTIONS = Array.from({ length: 5 }, (_, i) => ({
  id: `q${i}`,
  type: "mc",
  prompt: `문항 ${i + 1}`,
  tags: ["태그"],
  difficulty: "medium",
  choices: ["a", "b"],
  answer: "a",
}));

describe("CreateSet", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("[S1-1] 텍스트+객관식+보통+5 → 세트 생성 → 문항 5개 세트가 전달되고 첫 문항이 표시 가능하다", async () => {
    mockFetchOnce({ questions: FIVE_MC_QUESTIONS });
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    render(<CreateSet onGenerated={onGenerated} />);

    await user.type(screen.getByLabelText("학습자료"), "미적분 기초 자료");
    await user.click(screen.getByRole("button", { name: "세트 생성" }));

    await waitFor(() => expect(onGenerated).toHaveBeenCalledTimes(1));
    const [material, quizSet] = onGenerated.mock.calls[0];
    expect(quizSet.questions).toHaveLength(5);
    expect(quizSet.questions[0].prompt).toBe("문항 1"); // 첫 문항 표시에 쓰일 데이터
    expect(material.content).toBe("미적분 기초 자료");
  });

  it("[S1-2] .txt 파일 업로드 → 내용이 자료 입력 영역에 반영된다", async () => {
    const user = userEvent.setup();
    render(<CreateSet onGenerated={vi.fn()} />);

    const file = new File(["업로드된 자료 내용"], "note.txt", { type: "text/plain" });
    await user.upload(screen.getByLabelText("학습자료 파일 업로드"), file);

    await waitFor(() =>
      expect(screen.getByLabelText("학습자료")).toHaveValue("업로드된 자료 내용"),
    );
  });

  it("[S1-3] 자료가 비어 있으면 안내 문구가 표시되고 세트가 생성되지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    render(<CreateSet onGenerated={onGenerated} />);

    await user.click(screen.getByRole("button", { name: "세트 생성" }));

    expect(await screen.findByText("학습자료를 입력하세요")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it("[S1-4] 객관식+서술형 선택 → 생성된 세트에 두 유형이 함께 포함된다", async () => {
    mockFetchOnce({
      questions: [
        { id: "1", type: "mc", prompt: "P1", tags: ["t"], difficulty: "medium", choices: ["a"], answer: "a" },
        { id: "2", type: "essay", prompt: "P2", tags: ["t"], difficulty: "medium", rubric: "R" },
      ],
    });
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    render(<CreateSet onGenerated={onGenerated} />);

    // 기본값: 객관식 체크됨, 서술형 체크됨 (와이어프레임 기본값)
    await user.type(screen.getByLabelText("학습자료"), "자료");
    await user.click(screen.getByRole("button", { name: "세트 생성" }));

    await waitFor(() => expect(onGenerated).toHaveBeenCalledTimes(1));
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.types).toEqual(expect.arrayContaining(["mc", "essay"]));

    const [, quizSet] = onGenerated.mock.calls[0];
    const types = new Set(quizSet.questions.map((q: { type: string }) => q.type));
    expect(types.has("mc")).toBe(true);
    expect(types.has("essay")).toBe(true);
  });

  it("[S1-6] 생성 실패 → 에러 안내와 '다시 시도' 버튼이 표시되고 onGenerated는 호출되지 않는다", async () => {
    mockFetchOnce({ error: "문제 생성에 실패했습니다" }, false, 500);
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    render(<CreateSet onGenerated={onGenerated} />);

    await user.type(screen.getByLabelText("학습자료"), "자료");
    await user.click(screen.getByRole("button", { name: "세트 생성" }));

    expect(await screen.findByText("문제 생성에 실패했습니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it("existingMaterial을 내용 변경 없이 재사용하면 새 자료로 중복 저장하지 않는다 (독립 리뷰에서 발견)", async () => {
    const existing: Material = {
      id: "m-existing",
      title: "기존 자료",
      content: "기존 자료 본문",
      createdAt: 1,
    };
    mockFetchOnce({
      questions: [
        { id: "1", type: "mc", prompt: "P1", tags: ["t"], difficulty: "medium", choices: ["a"], answer: "a" },
      ],
    });
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    render(<CreateSet existingMaterial={existing} onGenerated={onGenerated} />);

    expect(screen.getByLabelText("학습자료")).toHaveValue("기존 자료 본문");
    await user.click(screen.getByRole("button", { name: "세트 생성" }));

    await waitFor(() => expect(onGenerated).toHaveBeenCalledTimes(1));
    const [material] = onGenerated.mock.calls[0];
    expect(material).toBe(existing); // 같은 참조 재사용, 새 id 아님
    expect(loadMaterials()).toHaveLength(0); // storage.addMaterial이 다시 호출되지 않음
  });

  it("existingMaterial의 내용을 수정하고 제출하면 새 자료로 저장된다", async () => {
    const existing: Material = {
      id: "m-existing",
      title: "기존 자료",
      content: "기존 자료 본문",
      createdAt: 1,
    };
    mockFetchOnce({
      questions: [
        { id: "1", type: "mc", prompt: "P1", tags: ["t"], difficulty: "medium", choices: ["a"], answer: "a" },
      ],
    });
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    render(<CreateSet existingMaterial={existing} onGenerated={onGenerated} />);

    await user.type(screen.getByLabelText("학습자료"), " 추가 내용");
    await user.click(screen.getByRole("button", { name: "세트 생성" }));

    await waitFor(() => expect(onGenerated).toHaveBeenCalledTimes(1));
    const [material] = onGenerated.mock.calls[0];
    expect(material.id).not.toBe(existing.id);
    expect(loadMaterials()).toHaveLength(1);
  });
});
