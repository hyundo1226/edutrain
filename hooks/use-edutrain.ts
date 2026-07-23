"use client";

// 화면 전환 + 현재 진행 중인 자료·세트 상태. 의존성: types (Architecture 레이어 5).
// T6~T9에서 채점 결과 기록, 세션 완료, 자료 선택 액션이 추가된다.
import { useCallback, useState } from "react";
import type { Material, QuizSet } from "@/types/quiz";

export type Screen = "home" | "create" | "quiz" | "result" | "weak-set";

export function useEduTrain() {
  const [screen, setScreen] = useState<Screen>("home");
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);
  const [currentSet, setCurrentSet] = useState<QuizSet | null>(null);

  /** 세트 생성 완료 → 자료·세트를 현재 진행 상태로 지정하고 풀이 화면으로 이동 */
  const startSet = useCallback((material: Material, quizSet: QuizSet) => {
    setCurrentMaterial(material);
    setCurrentSet(quizSet);
    setScreen("quiz");
  }, []);

  const goTo = useCallback((next: Screen) => setScreen(next), []);

  return {
    screen,
    currentMaterial,
    currentSet,
    startSet,
    goTo,
  };
}
