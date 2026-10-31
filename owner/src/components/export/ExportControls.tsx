import type { ReactNode } from 'react';

export function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="export-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="export-field">
      <span className="export-label">{label}</span>
      {children}
    </div>
  );
}

export function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <Field label={label}>
      <div className="export-seg" role="group" aria-label={label}>
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            className={value === id ? 'is-active' : ''}
            onClick={() => onChange(id)}
          >
            {text}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="export-field">
      <span className="export-label">
        {label}: {format ? format(value) : value}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </label>
  );
}

export const ROUTE_COLOURS = ['#fc5200', '#ffffff', '#111111', '#10b981', '#3b82f6', '#ec4899'];

export function ColourPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="export-swatches">
        {ROUTE_COLOURS.map((c) => (
          <button
            key={c}
            type="button"
            className={`export-swatch${value === c ? ' is-active' : ''}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={`${label} ${c}`}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Custom ${label}`}
        />
      </div>
    </Field>
  );
}
