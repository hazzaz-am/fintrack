import { AppError } from "@/lib/errors";
import { getSessionUserId } from "./session";

export async function requireAuth(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new AppError("UNAUTHENTICATED", "You must be logged in to perform this action.");
  }
  return userId;
}
