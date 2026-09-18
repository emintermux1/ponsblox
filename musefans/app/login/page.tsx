import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Sign in",
  description: "Open your MuseFans account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const search = await searchParams;
  const next = search.next && search.next.startsWith("/") ? search.next : "/";

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-12 md:pb-12">
      <LoginForm next={next} />
    </main>
  );
}
