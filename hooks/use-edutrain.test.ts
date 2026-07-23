import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEduTrain } from "@/hooks/use-edutrain";
import { loadSessions, loadStats, loadWeaknesses } from "@/lib/storage";
import type { AnswerResult, Material, QuizSet } from "@/types/quiz";

const material: Material = {
  id: "m1",
  title: "자료",
  content: "본문",
  createdAt: 1,
};

function mkQuizSet(): QuizSet {
  return {
    id: "set1",
    materialId: "m1",
    createdAt: 1,
    questions: [
      { id: "q1", type: "mc", prompt: "P1", tags: ["A"], difficulty: "medium", choices: ["x"], answer: "x" },
      { id: "q2", type: "mc", prompt: "P2", tags: ["B"], difficulty: "medium", choices: ["x"], answer: "x" },
    ],
  };
}

function r(questionId: string, correct: boolean): AnswerResult {
  return { questionId, given: "g", correct, score: correct ? 100 : 0 };
}

describe("useEduTrain", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("startSet은 자료·세트를 지정하고 quiz 화면으로 이동하며, 새 자료를 목록에 추가한다", () => {
    const { result } = renderHook(() => useEduTrain());

    act(() => {
      result.current.startSet(material, mkQuizSet());
    });

    expect(result.current.screen).toBe("quiz");
    expect(result.current.currentMaterial).toEqual(material);
    expect(result.current.currentSet?.id).toBe("set1");
    expect(result.current.results).toEqual([]);
    expect(result.current.materials.some((m) => m.id === "m1")).toBe(true);
  });

  it("startSet을 같은 material.id로 다시 호출해도 materials 목록에 중복이 생기지 않는다", () => {
    const { result } = renderHook(() => useEduTrain());

    act(() => {
      result.current.startSet(material, mkQuizSet());
    });
    act(() => {
      result.current.startSet(material, mkQuizSet());
    });

    expect(result.current.materials.filter((m) => m.id === "m1")).toHaveLength(1);
  });

  it("recordResult는 문항 채점 결과를 순서대로 누적한다", () => {
    const { result } = renderHook(() => useEduTrain());

    act(() => {
      result.current.startSet(material, mkQuizSet());
    });
    act(() => {
      result.current.recordResult(r("q1", true));
    });
    act(() => {
      result.current.recordResult(r("q2", false));
    });

    expect(result.current.results).toHaveLength(2);
    expect(result.current.results[0].questionId).toBe("q1");
    expect(result.current.results[1].correct).toBe(false);
  });

  it("completeSet은 세션·통계·약점을 영속화하고 result 화면으로 이동한다", () => {
    const { result } = renderHook(() => useEduTrain());

    act(() => {
      result.current.startSet(material, mkQuizSet());
    });
    act(() => {
      result.current.recordResult(r("q1", true));
      result.current.recordResult(r("q2", false));
    });
    act(() => {
      result.current.completeSet();
    });

    expect(result.current.screen).toBe("result");
    expect(result.current.stats.cumulativeScore).toBe(100);
    expect(result.current.activeWeakTags).toContain("B");

    // storage에도 실제로 반영되어야 한다 (INV-2 mechanism).
    expect(loadSessions()).toHaveLength(1);
    expect(loadStats().cumulativeScore).toBe(100);
    expect(loadWeaknesses().some((w) => w.tag === "B" && !w.mastered)).toBe(true);
  });

  it("currentSet/currentMaterial이 없는 상태에서 completeSet을 호출하면 저장 없이 result 화면으로만 이동한다", () => {
    const { result } = renderHook(() => useEduTrain());

    act(() => {
      result.current.completeSet();
    });

    expect(result.current.screen).toBe("result");
    expect(loadSessions()).toHaveLength(0);
  });

  it("selectMaterial은 자료를 지정하고 create 화면으로 이동한다 (S5-4)", () => {
    const { result } = renderHook(() => useEduTrain());

    act(() => {
      result.current.selectMaterial(material);
    });

    expect(result.current.screen).toBe("create");
    expect(result.current.currentMaterial).toEqual(material);
  });

  it("startCreateNew는 이전에 선택된 자료를 지우고 create 화면으로 이동한다", () => {
    const { result } = renderHook(() => useEduTrain());

    act(() => {
      result.current.selectMaterial(material);
    });
    act(() => {
      result.current.startCreateNew();
    });

    expect(result.current.screen).toBe("create");
    expect(result.current.currentMaterial).toBeNull();
  });

  it("goTo는 지정한 화면으로 바로 전환한다", () => {
    const { result } = renderHook(() => useEduTrain());

    act(() => {
      result.current.goTo("home");
    });

    expect(result.current.screen).toBe("home");
  });
});
