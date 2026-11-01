import {
  AuthField,
  AuthSelect,
} from "@/shared/components/auth/AuthShell";
import { TRADE_OPTIONS } from "@/shared/lib/trades/trade-options";

type TradeSelectFieldProps = {
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: string;
  /** Controlled mode (used by forms that must keep their values across a failed submit). */
  value?: string;
  onChange?: (value: string) => void;
};

export function TradeSelectField({
  id = "trade",
  name = "trade",
  required = true,
  disabled = false,
  defaultValue,
  value,
  onChange,
}: TradeSelectFieldProps) {
  const controlled =
    value !== undefined
      ? { value, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange?.(event.target.value) }
      : { defaultValue: defaultValue ?? "" };
  return (
    <AuthField
      label="What trade do you run?"
      id={id}
      hint="We'll use this to tailor examples, starter content, and future templates for your business."
    >
      <AuthSelect
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        {...controlled}
      >
        <option value="" disabled>
          Choose a trade
        </option>
        {TRADE_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </AuthSelect>
    </AuthField>
  );
}
