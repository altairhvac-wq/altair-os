type SettingsAlertBannerProps = {
  tone: "error" | "success" | "warning" | "info";
  children: React.ReactNode;
  className?: string;
  northStar?: boolean;
};

const TONE_STYLES: Record<
  SettingsAlertBannerProps["tone"],
  { container: string; text: string }
> = {
  error: {
    container: "border-rose-200 bg-rose-50",
    text: "text-rose-700",
  },
  success: {
    container: "border-emerald-200 bg-emerald-50",
    text: "text-emerald-700",
  },
  warning: {
    container: "border-amber-200 bg-amber-50",
    text: "text-amber-800",
  },
  info: {
    container: "border-cyan-200 bg-cyan-50",
    text: "text-cyan-800",
  },
};

const NORTH_STAR_TONE_STYLES: Record<
  SettingsAlertBannerProps["tone"],
  { container: string; text: string }
> = {
  error: {
    container: "border-[rgba(185,28,28,0.28)] bg-[rgba(254,242,242,0.92)]",
    text: "text-[#991B1B]",
  },
  success: {
    container: "border-[rgba(5,150,105,0.22)] bg-[rgba(236,253,245,0.92)]",
    text: "text-[#047857]",
  },
  warning: {
    container: "border-[rgba(180,83,9,0.22)] bg-[rgba(255,247,237,0.92)]",
    text: "text-[#9A3412]",
  },
  info: {
    container: "border-[rgba(138,99,36,0.22)] bg-[#FFF9EA]",
    text: "text-[#4F4638]",
  },
};

export function SettingsAlertBanner({
  tone,
  children,
  className = "",
  northStar = false,
}: SettingsAlertBannerProps) {
  const styles = northStar ? NORTH_STAR_TONE_STYLES[tone] : TONE_STYLES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`min-w-0 break-words rounded-lg border px-4 py-3 text-sm ${styles.container} ${styles.text} ${className}`}
    >
      {children}
    </div>
  );
}
