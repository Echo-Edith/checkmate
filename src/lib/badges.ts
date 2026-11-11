/** Profile badges. Both are saved on the profile and only the owner can change them. */

export type BadgeId = "owner" | "beta";

/** True if this verified sign-in email is listed in OWNER_EMAILS (comma separated). Never sent to the browser. */
export function isOwnerEmail(email: string | undefined): boolean {
  if (!email) return false;
  const owners = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return owners.includes(email.trim().toLowerCase());
}

export function badgesFor(input: { isOwner?: boolean; isBeta?: boolean }): BadgeId[] {
  const badges: BadgeId[] = [];
  if (input.isOwner) badges.push("owner");
  if (input.isBeta) badges.push("beta");
  return badges;
}
