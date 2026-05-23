import { describe, it, expect } from "vitest";
import { TfIdfEmbeddingProvider } from "../src/embedding.js";

describe("TfIdfEmbeddingProvider", () => {
  const docs = [
    "我喜欢编程和人工智能",
    "漫展是二次元爱好者的聚会活动",
    "Python是一种编程语言常用于机器学习和数据分析",
    "今天天气很好适合出去玩",
  ];

  const provider = new TfIdfEmbeddingProvider(128);
  provider.buildVocabulary(docs);

  it("embeds text to correct dimensions", async () => {
    const vec = await provider.embed("我喜欢编程");
    expect(vec.length).toBe(128);
  });

  it("returns L2 normalized vectors", async () => {
    const vec = await provider.embed("我喜欢编程");
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 2);
  });

  it("similar texts have high similarity", async () => {
    const a = await provider.embed("我喜欢编程和人工智能");
    const b = await provider.embed("我热爱机器学习和编程");
    const sim = provider.similarity(a, b);
    expect(sim).toBeGreaterThan(0.3);
  });

  it("dissimilar texts have low similarity", async () => {
    const a = await provider.embed("我喜欢编程");
    const b = await provider.embed("今天天气很好适合出去玩");
    const sim = provider.similarity(a, b);
    expect(sim).toBeLessThan(0.5);
  });

  it("identical texts have similarity of 1", async () => {
    const a = await provider.embed("漫展是二次元爱好者的聚会活动");
    const b = await provider.embed("漫展是二次元爱好者的聚会活动");
    const sim = provider.similarity(a, b);
    expect(sim).toBeCloseTo(1.0, 1);
  });

  it("tokenize handles Chinese text", () => {
    const tokens = TfIdfEmbeddingProvider.tokenize("我喜欢编程");
    expect(tokens.length).toBeGreaterThan(0);
    // Should include single chars and bigrams
    expect(tokens).toContain("我");
    expect(tokens).toContain("喜欢");
  });

  it("hashToDims returns consistent results", () => {
    const a = TfIdfEmbeddingProvider.hashToDims("测试", 256);
    const b = TfIdfEmbeddingProvider.hashToDims("测试", 256);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(256);
  });
});
