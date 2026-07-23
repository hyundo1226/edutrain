"use client";

// 화면 전환 + 현재 진행 중인 자료·세트·채점 결과 상태. 의존성: types (Architecture 레이어 5).
// T7(서술형 결과), T8(세션 완료·약점 세트), T9(자료 선택)에서 액션이 추가된다.
import { useCallback, useState } from "react";
import type { AnswerResult, Material, QuizSet } from "@/types/quiz";

export type Screen = "home" | "create" | "quiz" | "result" | "weak-set";

export function useEduTrain() {
  const [screen, setScreen] = useState<Screen>("home");
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);
  const [currentSet, setCurrentSet] = useState<QuizSet | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);

  /** 세트 생성 완료 → 자료·세트를 현재 진행 상태로 지정하고 풀이 화면으로 이동 */
  const startSet = useCallback((material: Material, quizSet: QuizSet) => {
    setCurrentMaterial(material);
    setCurrentSet(quizSet);
    setResults([]);
    setScreen("quiz");
  }, []);

  /** 문항 채점 결과를 세션 결과 목록에 기록 (객관식·단답·서술형 공통) */
  const recordResult = useCallback((result: AnswerResult) => {
    setResults((prev) => [...prev, result]);
  }, []);

  const goTo = useCallback((next: Screen) => setScreen(next), []);

  return {
    screen,
    currentMaterial,
    currentSet,
    results,
    startSet,
    recordResult,
    goTo,
  };
}
