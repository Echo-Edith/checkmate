import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaintenanceToggle } from "@/components/admin/MaintenanceToggle";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { getOwner } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Owner panel — Checkm8", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await getOwner())) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Owner panel</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Search players and give or remove the Tester badge.
      </p>
      <MaintenanceToggle />
      <AdminUsers />
    </main>
  );
}
