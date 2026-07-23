"use client";

// 클라이언트 셸 + 화면 전환. T9(홈)에서 홈 화면이 실제 구현으로 교체된다.
import { useEduTrain } from "@/hooks/use-edutrain";
import { CreateSet } from "@/components/edutrain/create-set";
import { QuizRunner } from "@/components/edutrain/quiz-runner";
import { ResultView } from "@/components/edutrain/result-view";
import { WeakSetPreview } from "@/components/edutrain/weak-set-preview";
import { Button } from "@/components/ui/button";

export default function Page() {
  const {
    screen,
    currentMaterial,
    currentSet,
    results,
    activeWeakTags,
    startSet,
    recordResult,
    completeSet,
    goTo,
  } = useEduTrain();

  if (screen === "create") {
    return <CreateSet onGenerated={startSet} />;
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

  // 홈 (T9에서 실제 통계·저장 자료 화면으로 교체된다)
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="text-xl font-bold">EduTrain</div>
        <Button onClick={() => goTo("create")}>+ 새 세트 만들기</Button>
      </div>
    </div>
  );
}
