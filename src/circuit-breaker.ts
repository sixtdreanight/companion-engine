/**
 * Circuit breaker — prevents cascade failures from slow/dead external services.
 *
 * 3 states: CLOSED (normal), OPEN (failing fast), HALF_OPEN (probing recovery).
 * When OPEN, calls immediately return fallback without touching the external service.
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreaker {
  state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private probeCount = 0;

  constructor(
    private failureThreshold = 3,
    private resetTimeoutMs = 30000,
    private halfOpenMaxCalls = 1,
  ) {}

  /** Execute fn with circuit breaker protection. If open, call fallback instead. */
  async call<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        this.probeCount = 0;
      } else {
        return fallback();
      }
    }

    if (this.state === "HALF_OPEN" && this.probeCount >= this.halfOpenMaxCalls) {
      return fallback();
    }

    if (this.state === "HALF_OPEN") {
      this.probeCount++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch {
      this.onFailure();
      return fallback();
    }
  }

  private onSuccess(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }
}
