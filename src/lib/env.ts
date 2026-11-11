/**
 * Environment variable helpers with clear error messages.
 * NEXT_PUBLIC_* variables must be referenced statically so Next.js can inline them.
 */

export function getSupabaseConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error(
      "Missing environment variable NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local and to Vercel project settings.",
    );
  }
  if (!key) {
    throw new Error(
      "Missing environment variable NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add it to .env.local and to Vercel project settings.",
    );
  }
  return { url, key };
}
