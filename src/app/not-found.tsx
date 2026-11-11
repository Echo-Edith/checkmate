import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        This page does not exist.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm underline">
        Back to home
      </Link>
    </main>
  );
}
