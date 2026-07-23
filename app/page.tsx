"use client";

// 클라이언트 셸 + 화면 전환. T7(서술형)·T8(결과)·T9(홈)에서 실제 구현으로 교체된다.
import { useEduTrain } from "@/hooks/use-edutrain";
import { CreateSet } from "@/components/edutrain/create-set";
import { QuizRunner } from "@/components/edutrain/quiz-runner";
import { Button } from "@/components/ui/button";
import { scoreSet } from "@/lib/scoring";

export default function Page() {
  const { screen, currentSet, results, startSet, recordResult, goTo } =
    useEduTrain();

  if (screen === "create") {
    return <CreateSet onGenerated={startSet} />;
  }

  if (screen === "quiz" && currentSet) {
    return (
      <QuizRunner
        quizSet={currentSet}
        onGraded={recordResult}
        onComplete={() => goTo("result")}
      />
    );
  }

  if (screen === "result") {
    // T8에서 result-view.tsx(약점 태그·추천·재출제)로 교체된다.
    const { score, total, percentage, correctCount, count } = scoreSet(results);
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p>
          세트 점수: {score}/{total} ({percentage}%) — {correctCount}/{count} 정답
        </p>
        <Button className="mt-4" onClick={() => goTo("home")}>
          홈으로
        </Button>
      </div>
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
