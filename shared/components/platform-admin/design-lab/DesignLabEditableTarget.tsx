import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";

type DesignLabEditableTargetProps = {
  targetId: DesignLabEditTargetId;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "button" | "span" | "p" | "h3" | "h4" | "li";
};

const EDITABLE_HOVER =
  "hover:outline hover:outline-1 hover:outline-[rgba(184,148,63,0.4)] hover:outline-offset-1";

const EDITABLE_SELECTED =
  "outline outline-2 outline-[rgba(184,148,63,0.65)] outline-offset-2";

export function DesignLabEditableTarget({
  targetId,
  selectedTargetId,
  onSelectTarget,
  children,
  className = "",
  style,
  as: Component = "div",
}: DesignLabEditableTargetProps) {
  const isSelected = selectedTargetId === targetId;

  function handleSelect(event: React.MouseEvent | React.KeyboardEvent) {
    event.stopPropagation();
    onSelectTarget(targetId);
  }

  const interactiveProps =
    Component === "button" ? ({ type: "button" as const } satisfies { type: "button" }) : {};

  return (
    <Component
      {...interactiveProps}
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect(event);
        }
      }}
      data-edit-target={targetId}
      aria-pressed={isSelected}
      className={[
        "cursor-pointer rounded-sm transition-[outline,box-shadow]",
        EDITABLE_HOVER,
        isSelected ? EDITABLE_SELECTED : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {children}
    </Component>
  );
}
