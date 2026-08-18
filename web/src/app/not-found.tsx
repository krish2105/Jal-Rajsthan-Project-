import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="font-[family-name:var(--font-display)] text-6xl font-bold text-gradient">404</p>
      <p className="text-sm text-[color:var(--text-2)]">
        This page doesn&apos;t exist. The water table, however, is definitely dropping.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-[color:var(--accent)] px-5 py-2.5 text-sm font-bold text-[color:var(--on-accent)]"
      >
        Back to the dashboard
      </Link>
    </main>
  );
}
