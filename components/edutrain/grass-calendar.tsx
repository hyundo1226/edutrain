"use client";

// 잔디(학습 달력): 최근 1년간 날짜별 학습량을 색 강도로 보여준다.
import { buildGrassGrid } from "@/lib/gamification";

// 강도별 배경색. Tailwind 임의값으로 GitHub 잔디와 유사한 단계를 표현한다.
const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted",
  1: "bg-primary/25",
  2: "bg-primary/50",
  3: "bg-primary/75",
  4: "bg-primary",
};

export interface GrassCalendarProps {
  dailyActivity: Record<string, number>;
  /** 테스트에서 고정 날짜를 주입할 수 있도록. 기본값은 실제 오늘. */
  today?: Date;
}

export function GrassCalendar({ dailyActivity, today = new Date() }: GrassCalendarProps) {
  const days = buildGrassGrid(dailyActivity, today, 365);

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col grid-rows-7 gap-1 w-max">
        {days.map((day) => (
          <div
            key={day.date}
            data-testid="grass-day"
            data-level={day.level}
            title={`${day.date}: ${day.count}문항`}
            className={`size-3 rounded-sm ${LEVEL_CLASS[day.level]}`}
          />
        ))}
      </div>
    </div>
  );
}
