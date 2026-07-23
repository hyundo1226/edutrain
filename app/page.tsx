"use client";

// 클라이언트 셸 + 화면 전환.
import { useEduTrain } from "@/hooks/use-edutrain";
import { CreateSet } from "@/components/edutrain/create-set";
import { QuizRunner } from "@/components/edutrain/quiz-runner";
import { ResultView } from "@/components/edutrain/result-view";
import { WeakSetPreview } from "@/components/edutrain/weak-set-preview";
import { Home } from "@/components/edutrain/home";

export default function Page() {
  const {
    screen,
    currentMaterial,
    currentSet,
    results,
    stats,
    sessions,
    materials,
    activeWeakTags,
    startSet,
    recordResult,
    completeSet,
    selectMaterial,
    startCreateNew,
    goTo,
  } = useEduTrain();

  if (screen === "create") {
    return (
      <CreateSet
        existingMaterial={currentMaterial ?? undefined}
        onGenerated={startSet}
      />
    );
  }

  if (screen === "quiz" && currentSet) {
    return (
      <QuizRunner
        quizSet={currentSet}
        onGraded={recordResult}
        onComplete={completeSet}
      />
    );
  }

  if (screen === "result" && currentSet) {
    return (
      <ResultView
        quizSet={currentSet}
        results={results}
        hasActiveWeakTags={activeWeakTags.length > 0}
        onRetryWeak={() => goTo("weak-set")}
        onHome={() => goTo("home")}
      />
    );
  }

  if (screen === "weak-set" && currentMaterial) {
    return (
      <WeakSetPreview
        material={currentMaterial}
        weakTags={activeWeakTags}
        onStart={startSet}
      />
    );
  }

  return (
    <Home
      stats={stats}
      sessions={sessions}
      materials={materials}
      onCreateNew={startCreateNew}
      onSelectMaterial={selectMaterial}
    />
  );
}
