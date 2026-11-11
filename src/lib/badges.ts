/** Profile badges. Owner is saved on the profile; Beta tester is worked out from the join date. */

export type BadgeId = "owner" | "beta";

/** Everyone who joined before this date is a beta tester. Change it with the BETA_ENDS variable. */
function betaEnds(): number {
  const parsed = Date.parse(process.env.BETA_ENDS ?? "");
  return Number.isNaN(parsed) ? Date.parse("2027-01-01T00:00:00Z") : parsed;
}

/** True if this verified sign-in email is listed in OWNER_EMAILS (comma separated). Never sent to the browser. */
export function isOwnerEmail(email: string | undefined): boolean {
  if (!email) return false;
  const owners = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return owners.includes(email.trim().toLowerCase());
}

export function badgesFor(input: { isOwner?: boolean; createdAt: Date | string }): BadgeId[] {
  const badges: BadgeId[] = [];
  if (input.isOwner) badges.push("owner");
  const joined = new Date(input.createdAt).getTime();
  if (!Number.isNaN(joined) && joined < betaEnds()) badges.push("beta");
  return badges;
}
