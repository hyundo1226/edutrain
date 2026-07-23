"use client";

// 화면 전환 + 현재 진행 중인 자료·세트·채점 결과 상태. 의존성: types, lib (Architecture 레이어 5).
import { useCallback, useEffect, useState } from "react";
import type {
  AnswerResult,
  Material,
  QuizSet,
  SessionRecord,
  Stats,
  WeaknessEntry,
} from "@/types/quiz";
import * as storage from "@/lib/storage";
import { EMPTY_STATS, recordSessionStats } from "@/lib/stats";
import { scoreSet } from "@/lib/scoring";
import { updateWeaknesses, activeWeakTags } from "@/lib/weakness";

export type Screen = "home" | "create" | "quiz" | "result" | "weak-set";

function todayString(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function useEduTrain() {
  const [screen, setScreen] = useState<Screen>("home");
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);
  const [currentSet, setCurrentSet] = useState<QuizSet | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);

  // SSR과 클라이언트 첫 렌더의 hydration mismatch를 피하기 위해, localStorage 값은
  // useState 초기화 함수가 아니라 마운트 후 useEffect에서 읽는다 (아래 참고).
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [weaknesses, setWeaknesses] = useState<WeaknessEntry[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    setStats(storage.loadStats());
    setWeaknesses(storage.loadWeaknesses());
    setSessions(storage.loadSessions());
    setMaterials(storage.loadMaterials());
  }, []);

  /** 세트 생성 완료 → 자료·세트를 현재 진행 상태로 지정하고 풀이 화면으로 이동 */
  const startSet = useCallback((material: Material, quizSet: QuizSet) => {
    setCurrentMaterial(material);
    setCurrentSet(quizSet);
    setResults([]);
    // create-set.tsx/weak-set-preview.tsx가 storage에 직접 저장하므로, 훅의 목록도 함께 동기화한다.
    setMaterials((prev) =>
      prev.some((m) => m.id === material.id) ? prev : [material, ...prev],
    );
    setScreen("quiz");
  }, []);

  /** 홈에서 저장 자료 선택 → 그 자료로 새 세트를 만들 수 있게 생성 화면으로 이동 (S5-4) */
  const selectMaterial = useCallback((material: Material) => {
    setCurrentMaterial(material);
    setScreen("create");
  }, []);

  /** "+ 새 세트 만들기" → 이전에 선택된 자료를 지우고 빈 생성 화면으로 이동 */
  const startCreateNew = useCallback(() => {
    setCurrentMaterial(null);
    setScreen("create");
  }, []);

  /** 문항 채점 결과를 세션 결과 목록에 기록 (객관식·단답·서술형 공통) */
  const recordResult = useCallback((result: AnswerResult) => {
    setResults((prev) => [...prev, result]);
  }, []);

  /** 세트 완료: 세션 기록·누적 통계·약점을 갱신해 영속화하고 결과 화면으로 이동 */
  const completeSet = useCallback(() => {
    if (!currentSet || !currentMaterial) {
      setScreen("result");
      return;
    }
    const { score, total } = scoreSet(results);

    const nextWeaknesses = updateWeaknesses(
      storage.loadWeaknesses(),
      currentSet.questions,
      results,
    );
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      materialId: currentMaterial.id,
      score,
      total,
      weakTags: activeWeakTags(nextWeaknesses),
      completedAt: Date.now(),
    };
    const nextStats = recordSessionStats(storage.loadStats(), {
      score,
      results,
      today: todayString(),
    });

    const nextSessions = storage.addSession(session);
    storage.saveStats(nextStats);
    storage.saveWeaknesses(nextWeaknesses);

    setSessions(nextSessions);
    setStats(nextStats);
    setWeaknesses(nextWeaknesses);
    setScreen("result");
  }, [currentSet, currentMaterial, results]);

  const goTo = useCallback((next: Screen) => setScreen(next), []);

  return {
    screen,
    currentMaterial,
    currentSet,
    results,
    stats,
    sessions,
    weaknesses,
    materials,
    activeWeakTags: activeWeakTags(weaknesses),
    startSet,
    recordResult,
    completeSet,
    selectMaterial,
    startCreateNew,
    goTo,
  };
}
