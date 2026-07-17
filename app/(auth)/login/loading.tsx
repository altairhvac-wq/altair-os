import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { LoginPageShell } from "@/shared/components/auth/LoginPageShell";

function LoginMarketingSkeleton() {
  return (
    <section
      className="relative min-h-dvh overflow-hidden bg-[#14110c] px-5 py-7 text-white sm:px-8 sm:py-9"
      aria-hidden="true"
    >
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto max-w-[1160px] animate-pulse motion-reduce:animate-none">
        <AltairLogo variant="white" size="lg" showWordmark />
        <div className="mt-10 grid items-center gap-8 xl:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-4">
            <div className="h-2.5 w-48 rounded-full bg-[#c9a44d]/20" />
            <div className="h-14 w-full max-w-lg rounded-xl bg-white/[0.07]" />
            <div className="h-14 w-4/5 max-w-md rounded-xl bg-white/[0.05]" />
            <div className="h-16 w-full max-w-lg rounded-xl bg-white/[0.035]" />
          </div>
          <div className="aspect-[16/11] min-h-[290px] rounded-[1.4rem] border border-white/10 bg-white/[0.045]" />
        </div>
        <div className="mt-6 h-28 rounded-[1.35rem] border border-white/[0.08] bg-white/[0.035]" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 rounded-2xl border border-white/[0.08] bg-white/[0.03]" />
          ))}
        </div>
      </div>
    </section>
  );
}

function LoginFormSkeleton() {
  return (
    <div
      className="animate-pulse motion-reduce:animate-none"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading sign-in form</span>
      <div className="space-y-4" aria-hidden="true">
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-white/[0.08]" />
          <div className="h-12 rounded-lg bg-white/[0.06]" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-white/[0.08]" />
          <div className="h-12 rounded-lg bg-white/[0.06]" />
        </div>
        <div className="h-12 rounded-lg bg-[#c9a44d]/35" />
      </div>
    </div>
  );
}

export default function LoginLoading() {
  return (
    <LoginPageShell heroPanel={<LoginMarketingSkeleton />}>
      <LoginFormSkeleton />
    </LoginPageShell>
  );
}
