import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GrassCalendar } from "@/components/edutrain/grass-calendar";

const TODAY = new Date("2026-07-23T00:00:00");

describe("GrassCalendar", () => {
  it("[S1-1] 오늘을 포함해 최근 365일치 칸이 렌더된다", () => {
    render(<GrassCalendar dailyActivity={{}} today={TODAY} />);
    expect(screen.getAllByTestId("grass-day")).toHaveLength(365);
  });

  it("[S1-3] 활동이 없는 날은 빈 칸(레벨 0) 상태로 렌더된다", () => {
    render(<GrassCalendar dailyActivity={{}} today={TODAY} />);
    const days = screen.getAllByTestId("grass-day");
    expect(days.every((d) => d.getAttribute("data-level") === "0")).toBe(true);
  });

  it("[S1-2] 문항 수가 다른 날은 서로 다른 강도(data-level)로 렌더된다", () => {
    render(
      <GrassCalendar
        dailyActivity={{ "2026-07-23": 10, "2026-07-22": 2 }}
        today={TODAY}
      />,
    );
    const days = screen.getAllByTestId("grass-day");
    const today = days[days.length - 1];
    const yesterday = days[days.length - 2];
    expect(today.getAttribute("data-level")).toBe("4");
    expect(yesterday.getAttribute("data-level")).toBe("1");
    expect(today.getAttribute("data-level")).not.toBe(yesterday.getAttribute("data-level"));
  });

  it("각 칸에는 날짜·문항 수를 담은 접근성 정보(title)가 있다", () => {
    render(<GrassCalendar dailyActivity={{ "2026-07-23": 5 }} today={TODAY} />);
    const days = screen.getAllByTestId("grass-day");
    const today = days[days.length - 1];
    expect(today.getAttribute("title")).toContain("2026-07-23");
    expect(today.getAttribute("title")).toContain("5");
  });
});
