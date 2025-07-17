import { env } from "~/env";

export const DAILY_REQUEST_LIMIT_ANONYMOUS = env.DAILY_REQUEST_LIMIT_ANONYMOUS;
export const DAILY_REQUEST_LIMIT_AUTHENTICATED = env.DAILY_REQUEST_LIMIT_AUTHENTICATED;

export interface RateLimitCheckResult {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  resetAt?: Date;
}

export function checkRateLimit(
  requestCount: number,
  isAdmin: boolean,
  isAuthenticated: boolean = true
): RateLimitCheckResult {
  // Admins have unlimited access
  if (isAdmin) {
    return { allowed: true };
  }

  const limit = isAuthenticated 
    ? DAILY_REQUEST_LIMIT_AUTHENTICATED 
    : DAILY_REQUEST_LIMIT_ANONYMOUS;

  if (requestCount >= limit) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: tomorrow,
    };
  }

  return {
    allowed: true,
    limit,
    remaining: limit - requestCount,
  };
}