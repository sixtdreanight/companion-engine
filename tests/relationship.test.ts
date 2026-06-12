import { describe, it, expect } from "vitest";
import {
  createRelationshipState,
  calculateAffectionDelta,
  updateAffection,
  applyAffectionDecay,
  handleConfession,
  handleBoundaryViolation,
  checkBoundaryViolation,
  executeBreakup,
  stayFriends,
  STAGE_LABELS,
} from "../src/relationship.js";

describe("createRelationshipState", () => {
  it("slow_burn starts as stranger with 0 affection", () => {
    const state = createRelationshipState("slow_burn");
    expect(state.stage).toBe("stranger");
    expect(state.affection).toBe(0);
    expect(state.mode).toBe("slow_burn");
  });

  it("direct starts as lover with 80 affection", () => {
    const state = createRelationshipState("direct");
    expect(state.stage).toBe("lover");
    expect(state.affection).toBe(80);
  });

  it("sets lastInteractionAt", () => {
    const state = createRelationshipState("slow_burn");
    expect(state.lastInteractionAt).toBeDefined();
    expect(new Date(state.lastInteractionAt).getTime()).toBeGreaterThan(0);
  });
});

describe("calculateAffectionDelta", () => {
  it("long message gives positive delta", () => {
    const delta = calculateAffectionDelta(
      "今天我去看了一个很有意思的展览，里面有很多精美的画作和雕塑，感觉收获很多",
      [],
    );
    expect(delta).toBeGreaterThan(0);
  });

  it("very short message gives negative delta", () => {
    const delta = calculateAffectionDelta("嗯", []);
    expect(delta).toBeLessThan(0);
  });

  it("positive keywords increase affection", () => {
    const delta = calculateAffectionDelta("哈哈谢谢你说的太好了", []);
    expect(delta).toBeGreaterThan(0);
  });

  it("negative keywords decrease affection", () => {
    const delta = calculateAffectionDelta("走开别烦我", []);
    expect(delta).toBeLessThan(0);
  });
});

describe("updateAffection", () => {
  it("accumulates affection and updates interaction time", async () => {
    const state = createRelationshipState("slow_burn");
    await updateAffection(state, 5);
    expect(state.affection).toBe(5);
    expect(state.totalInteractions).toBe(1);
    expect(state.lastInteractionAt).toBeTruthy();
  });

  it("clamps affection to 0-100", async () => {
    const state = createRelationshipState("slow_burn");
    await updateAffection(state, -999);
    expect(state.affection).toBe(0);
    await updateAffection(state, 999);
    expect(state.affection).toBe(100);
  });

  it("promotes stage when affection crosses threshold in slow_burn", async () => {
    const state = createRelationshipState("slow_burn");
    await updateAffection(state, 20); // crosses friend threshold (15)
    expect(state.stage).toBe("friend");
  });

  it("does not promote in direct mode", async () => {
    const state = createRelationshipState("direct");
    await updateAffection(state, -50);
    expect(state.stage).toBe("lover");
  });
});

describe("applyAffectionDecay", () => {
  it("does not decay if less than 7 days", () => {
    const state = createRelationshipState("slow_burn");
    state.affection = 50;
    state.lastInteractionAt = new Date().toISOString();  // just now
    applyAffectionDecay(state);
    expect(state.affection).toBe(50);
  });

  it("does not decay in direct mode", () => {
    const state = createRelationshipState("direct");
    state.affection = 80;
    state.lastInteractionAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    applyAffectionDecay(state);
    expect(state.affection).toBe(80);
  });

  it("decays after 7 days of no interaction", () => {
    const state = createRelationshipState("slow_burn");
    state.affection = 50;
    state.lastInteractionAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    applyAffectionDecay(state);
    expect(state.affection).toBeLessThan(50);
    expect(state.affection).toBeGreaterThan(45); // ~3 days of decay
  });
});

describe("handleConfession", () => {
  it("succeeds with max affection (deterministic)", async () => {
    const state = createRelationshipState("slow_burn");
    state.affection = 100;  // 100% success chance
    state.stage = "crush";
    const result = await handleConfession(state);
    expect(result.success).toBe(true);
    expect(state.stage).toBe("lover");
  });

  it("fails with very low affection", async () => {
    const state = createRelationshipState("slow_burn");
    state.affection = 10;
    const result = await handleConfession(state);
    expect(result.success).toBe(false);
  });
});

describe("checkBoundaryViolation", () => {
  it("detects abusive language with personal attack", () => {
    expect(checkBoundaryViolation("人身攻击你真是个废物")).toBe(true);
  });

  it("detects threats", () => {
    expect(checkBoundaryViolation("威胁要伤害你")).toBe(true);
  });

  it("passes normal messages", () => {
    expect(checkBoundaryViolation("今天天气不错")).toBe(false);
  });
});

describe("handleBoundaryViolation", () => {
  it("escalates to breakup after 3 warnings", async () => {
    const state = createRelationshipState("slow_burn");
    state.boundaryWarnings = 2;
    const result = await handleBoundaryViolation(state);
    expect(result.shouldBreakup).toBe(true);
    expect(state.breakupPending).toBe(true);
  });
});

describe("executeBreakup", () => {
  it("resets relationship state", async () => {
    const state = createRelationshipState("slow_burn");
    state.affection = 80;
    state.stage = "lover";
    await executeBreakup(state);
    expect(state.stage).toBe("stranger");
    expect(state.affection).toBe(0);
  });
});

describe("stayFriends", () => {
  it("resets to friend stage with 20 affection", async () => {
    const state = createRelationshipState("slow_burn");
    state.affection = 80;
    state.breakupPending = true;
    await stayFriends(state);
    expect(state.stage).toBe("friend");
    expect(state.affection).toBe(20);
    expect(state.breakupPending).toBe(false);
  });
});
