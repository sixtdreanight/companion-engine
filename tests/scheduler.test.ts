import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSchedule = vi.fn().mockReturnValue({ stop: vi.fn() });
vi.mock("node-cron", () => ({
  default: { schedule: (...args: unknown[]) => mockSchedule(...args) },
}));

import { startScheduler } from "../src/scheduler.js";
import type { ScheduledTasks } from "../src/scheduler.js";

function makeTasks(overrides?: Partial<ScheduledTasks>): ScheduledTasks {
  return {
    sendMessage: vi.fn().mockResolvedValue(undefined),
    getActiveUsers: () => ["user-1", "user-2"],
    profile: {
      name: "小美",
      user_nickname: "宝贝",
      hobbies: ["看剧", "打游戏"],
      age: 20,
      city: "上海",
      occupation: "设计师",
      education: "本科",
      major: "视觉传达",
      temperament: "温柔活泼",
      speaking_style: "撒娇",
      user_gender: "male" as const,
      partner_gender: "female" as const,
      relationship_type: "girlfriend" as const,
      relationship_mode: "direct" as const,
      user_city: "上海",
      user_timezone: "Asia/Shanghai",
      opinions: {},
      daily_life: "朝九晚五",
      quirks: [],
      meme_style: "可爱",
    },
    ...overrides,
  };
}

describe("startScheduler", () => {
  beforeEach(() => {
    mockSchedule.mockClear();
  });

  it("registers 4 cron jobs (morning, night, afternoon, memory)", () => {
    const tasks = makeTasks();
    const { stop } = startScheduler(tasks);

    expect(mockSchedule).toHaveBeenCalledTimes(4);

    const calls = mockSchedule.mock.calls;
    const crons = calls.map((c: string[]) => c[0]);

    expect(crons).toContain("37 8 * * *");
    expect(crons).toContain("17 22 * * *");
    expect(crons).toContain("47 15 * * 1-5");
    expect(crons).toContain("0 3 * * *");

    stop();
  });

  it("handles empty active users gracefully", () => {
    const tasks = makeTasks({ getActiveUsers: () => [] });
    const { stop } = startScheduler(tasks);

    const morningCall = mockSchedule.mock.calls.find(
      (c: string[]) => c[0] === "37 8 * * *"
    );
    expect(morningCall).toBeDefined();

    const morningCb = morningCall[1] as () => void;
    expect(() => morningCb()).not.toThrow();

    stop();
  });

  it("stop() calls stop() on all jobs", () => {
    const tasks = makeTasks();
    const { stop } = startScheduler(tasks);

    stop();
    expect(mockSchedule).toHaveBeenCalledTimes(4);
    for (const call of mockSchedule.mock.results) {
      expect(call.value.stop).toHaveBeenCalled();
    }
  });
});
