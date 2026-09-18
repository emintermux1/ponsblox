export function CtaSignIn({ href = "/login" }: { href?: string }) {
  return (
    <a
      href={href}
      className="inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white"
    >
      Sign in
    </a>
  );
}
