import { AppError } from "@/lib/errors";

interface Bucket {
  count: number;
  windowStart: number;
}

// In-memory fixed-window limiter. Sufficient for a single-instance hobby
// deployment; would need a shared store (Redis) behind a load balancer.
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

export function enforceRateLimit(key: string, maxAttempts = MAX_ATTEMPTS, windowMs = WINDOW_MS): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }

  bucket.count += 1;
  if (bucket.count > maxAttempts) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Please try again shortly.");
  }
}
