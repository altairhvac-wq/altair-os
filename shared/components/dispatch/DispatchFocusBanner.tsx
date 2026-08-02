import Link from "next/link";
import { Radio, X } from "lucide-react";
import { dispatchMissionClasses as dm } from "./dispatch-board-presentation";

type DispatchFocusBannerProps = {
  title: string;
  description: string;
  clearHref: string;
};

export function DispatchFocusBanner({
  title,
  description,
  clearHref,
}: DispatchFocusBannerProps) {
  return (
    <div className={dm.focusBanner}>
      <div className="flex min-w-0 items-start gap-2 sm:gap-3">
        <div className={dm.focusBannerIcon}>
          <Radio className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className={dm.focusBannerTitle}>{title}</p>
          <p className={dm.focusBannerDescription}>{description}</p>
        </div>
      </div>
      <Link href={clearHref} className={dm.focusBannerClear}>
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Clear view
      </Link>
    </div>
  );
}
