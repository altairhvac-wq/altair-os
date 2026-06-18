import { AltairLogo } from "@/shared/components/brand/AltairLogo";

export function PublicDocumentBrandFooter() {
  return (
    <footer className="no-print mt-6 flex flex-col items-center gap-1.5 pb-2 sm:mt-8">
      <AltairLogo
        variant="gold"
        size="sm"
        showWordmark
        className="opacity-70"
      />
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
        Powered by Altair OS
      </p>
    </footer>
  );
}
