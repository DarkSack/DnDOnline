import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const baseInput =
  "rounded-md border border-border bg-input/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export function FieldLabel({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {hint && <span className="text-[10px]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <FieldLabel label={label} hint={hint} className={className}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={baseInput}
      />
    </FieldLabel>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <FieldLabel label={label} hint={hint} className={className}>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className={baseInput}
      />
    </FieldLabel>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  className,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly (T | { value: T; label: string })[];
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <FieldLabel label={label} hint={hint} className={className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={baseInput}
      >
        {options.map((o) => {
          const [v, l] = typeof o === "string" ? [o, o] : [o.value, o.label];
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </FieldLabel>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <FieldLabel label={label} hint={hint} className={className}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={baseInput}
      />
    </FieldLabel>
  );
}
