import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/badges";

/** Returns the signed-in user only if their verified email is in OWNER_EMAILS. Otherwise null. */
export async function getOwner() {
  const user = await getCurrentUser();
  return user && isOwnerEmail(user.email) ? user : null;
}
