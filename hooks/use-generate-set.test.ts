import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGenerateSet } from "@/hooks/use-generate-set";

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

describe("useGenerateSet", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("성공 시 QuizSet을 반환하고 error는 null로 유지된다", async () => {
    mockFetchOnce({
      questions: [
        { id: "1", type: "mc", prompt: "P", tags: ["t"], difficulty: "medium", choices: ["a"], answer: "a" },
      ],
    });
    const { result } = renderHook(() => useGenerateSet());

    let quizSet;
    await act(async () => {
      quizSet = await result.current.generate(
        { material: "자료", types: ["mc"], difficulty: "medium", count: 1 },
        "material-1",
      );
    });

    expect(quizSet).not.toBeNull();
    expect(quizSet!.materialId).toBe("material-1");
    expect(quizSet!.questions).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("실패 응답이면 null을 반환하고 error에 서버 메시지를 담는다", async () => {
    mockFetchOnce({ error: "문제 생성에 실패했습니다" }, false);
    const { result } = renderHook(() => useGenerateSet());

    let quizSet;
    await act(async () => {
      quizSet = await result.current.generate(
        { material: "자료", types: ["mc"], difficulty: "medium", count: 1 },
        "material-1",
      );
    });

    expect(quizSet).toBeNull();
    expect(result.current.error).toBe("문제 생성에 실패했습니다");
  });

  it("네트워크 예외가 나면 null을 반환하고 일반 에러 메시지를 담는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network down")));
    const { result } = renderHook(() => useGenerateSet());

    let quizSet;
    await act(async () => {
      quizSet = await result.current.generate(
        { material: "자료", types: ["mc"], difficulty: "medium", count: 1 },
        "material-1",
      );
    });

    expect(quizSet).toBeNull();
    expect(result.current.error).toBe("세트 생성에 실패했습니다");
  });

  it("generate 호출 중에는 loading이 true다", async () => {
    let resolveFetch: (v: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );
    const { result } = renderHook(() => useGenerateSet());

    act(() => {
      void result.current.generate(
        { material: "자료", types: ["mc"], difficulty: "medium", count: 1 },
        "material-1",
      );
    });

    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => {
      resolveFetch({ ok: true, json: () => Promise.resolve({ questions: [] }) });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
