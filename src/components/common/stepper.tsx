"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Com `allowRemove`, o "–" no mínimo vira lixeira (remove do carrinho). */
  allowRemove?: boolean;
  label: string;
}

/** Seletor de quantidade com alvos de toque de 44 px. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 50,
  allowRemove,
  label,
}: Props) {
  const atMin = value <= min;
  return (
    <div
      className="inline-flex items-center rounded-full border border-zinc-200"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-full text-brand disabled:text-zinc-300"
        onClick={() => onChange(value - 1)}
        disabled={atMin && !allowRemove}
        aria-label={
          atMin && allowRemove ? "Remover item" : "Diminuir quantidade"
        }
      >
        {atMin && allowRemove ? (
          <Trash2 className="size-5" />
        ) : (
          <Minus className="size-5" />
        )}
      </button>
      <span
        className="min-w-8 text-center text-base font-semibold tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-full text-brand disabled:text-zinc-300"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Aumentar quantidade"
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}
