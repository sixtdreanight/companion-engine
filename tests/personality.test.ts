import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  buildTimeContext,
  buildSensoryContext,
  detectSadness,
  isConversationDying,
  suggestTopic,
  buildEmotionalSupportHint,
  buildCrisisHint,
  createSession,
  updateSession,
  shouldRemindBreak,
} from "../src/girlfriend.js";

const minimalProfile = {
  name: "小美",
  age: 22,
  city: "上海",
  occupation: "设计师",
  education: "本科",
  major: "视觉传达",
  hobbies: ["看剧", "画画", "音乐"],
  temperament: "温柔活泼",
  speaking_style: "自然口语化，喜欢用颜文字",
  user_nickname: "小明",
  user_gender: "male" as const,
  partner_gender: "female" as const,
  relationship_type: "girlfriend" as const,
  relationship_mode: "slow_burn" as const,
  user_city: "北京",
  user_timezone: "Asia/Shanghai",
  opinions: {},
  daily_life: "朝九晚五，喜欢下班后看剧画画",
  quirks: ["偶尔忘事", "喜欢收集杯子"],
  meme_style: "适中使用表情包",
};

describe("buildSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = buildSystemPrompt(minimalProfile, "晚上", "日常");
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("小美");
    expect(prompt).toContain("小明");
  });

  it("includes character info", () => {
    const prompt = buildSystemPrompt(minimalProfile, "下午", "开心");
    expect(prompt).toContain("设计师");
    expect(prompt).toContain("视觉传达");
  });

  it("includes output rules", () => {
    const prompt = buildSystemPrompt(minimalProfile, "上午", "日常");
    expect(prompt).toContain("output_rules");
  });

  it("includes safety rules", () => {
    const prompt = buildSystemPrompt(minimalProfile, "上午", "日常");
    expect(prompt).toContain("safety");
  });
});

describe("buildTimeContext", () => {
  it("returns a string with time info", () => {
    const ctx = buildTimeContext("Asia/Shanghai");
    expect(ctx.length).toBeGreaterThan(0);
    expect(ctx).toContain("年");
    expect(ctx).toContain("月");
    expect(ctx).toContain("日");
  });
});

describe("buildSensoryContext", () => {
  it("returns a string", () => {
    const ctx = buildSensoryContext("Asia/Shanghai");
    expect(ctx.length).toBeGreaterThan(0);
  });
});

describe("detectSadness", () => {
  it("detects crisis keywords", () => {
    expect(detectSadness("不想活了")).toBe("crisis");
    expect(detectSadness("想死")).toBe("crisis");
  });

  it("detects sad keywords", () => {
    expect(detectSadness("我好难过")).toBe("sad");
    expect(detectSadness("压力好大崩溃了")).toBe("sad");
  });

  it("returns normal for regular messages", () => {
    expect(detectSadness("今天天气不错")).toBe("normal");
  });
});

describe("isConversationDying", () => {
  it("detects dying conversation from short replies", () => {
    expect(isConversationDying(["嗯", "哦", "好"])).toBe(true);
  });

  it("returns false for engaged conversation", () => {
    expect(isConversationDying(["今天去看了电影超级好看！", "然后还吃了火锅", "明天也要出去玩"])).toBe(false);
  });

  it("returns false for insufficient messages", () => {
    expect(isConversationDying(["嗯"])).toBe(false);
  });
});

describe("suggestTopic", () => {
  it("returns a string", () => {
    const topic = suggestTopic(minimalProfile);
    expect(typeof topic).toBe("string");
    expect(topic.length).toBeGreaterThan(0);
  });
});

describe("buildEmotionalSupportHint", () => {
  it("includes user nickname", () => {
    const hint = buildEmotionalSupportHint("小明");
    expect(hint).toContain("小明");
    expect(hint.length).toBeGreaterThan(0);
  });
});

describe("buildCrisisHint", () => {
  it("includes hotline info and user nickname", () => {
    const hint = buildCrisisHint("小明");
    expect(hint).toContain("小明");
    expect(hint).toContain("010-82951332");
  });
});

describe("createSession", () => {
  it("creates initial session state", () => {
    const session = createSession();
    expect(session.messageCount).toBe(0);
    expect(session.userEngaged).toBe(true);
    expect(session.consecutiveShortReplies).toBe(0);
  });
});

describe("updateSession", () => {
  it("tracks message count", () => {
    const session = createSession();
    updateSession(session, "hello");
    expect(session.messageCount).toBe(1);
  });

  it("detects short replies", () => {
    const session = createSession();
    updateSession(session, "嗯");
    expect(session.consecutiveShortReplies).toBe(1);
  });

  it("resets consecutive count on long message", () => {
    const session = createSession();
    updateSession(session, "嗯");
    updateSession(session, "今天天气真好出去玩很开心");  // >= 10 chars
    expect(session.consecutiveShortReplies).toBe(0);
  });
});
