import { and, count, eq, gte } from "drizzle-orm";
import { db } from "../db";
import { userRequests, users } from "../db/schema";

export async function getUserRequestsToday(opts: {
  userId: string;
}): Promise<number> {
  const { userId } = opts;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: count() })
    .from(userRequests)
    .where(
      and(eq(userRequests.userId, userId), gte(userRequests.createdAt, today)),
    );

  return result[0]?.count ?? 0;
}

export async function createUserRequest(opts: {
  userId: string;
}): Promise<void> {
  const { userId } = opts;
  
  await db.insert(userRequests).values({
    userId,
  });
}

export async function isUserAdmin(opts: {
  userId: string;
}): Promise<boolean> {
  const { userId } = opts;
  
  const result = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId));

  return result[0]?.isAdmin ?? false;
}