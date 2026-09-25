import { brand } from "@/lib/brand";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold text-heading">{brand.name}</h1>
      <p className="max-w-md text-muted">{brand.tagline}.</p>
      <p className="text-sm text-muted">
        The application is being assembled. Sign-in and the inbox arrive with the next slices.
      </p>
    </main>
  );
}
