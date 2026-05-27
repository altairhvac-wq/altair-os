type SettingsAlertBannerProps = {
  tone: "error" | "success" | "warning" | "info";
  children: React.ReactNode;
  className?: string;
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

export function SettingsAlertBanner({
  tone,
  children,
  className = "",
}: SettingsAlertBannerProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${styles.container} ${styles.text} ${className}`}
    >
      {children}
    </div>
  );
}
