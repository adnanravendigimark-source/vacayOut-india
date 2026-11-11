"use client";

import { ImagePicker } from "./media";

/** Labelled image picker (upload, Media Library or URL). */
export function ImageField({ label, value, onChange, aspect, hint, onCredit }: { label: string; value: string; onChange: (url: string) => void; aspect?: string; hint?: string; onCredit?: (credit: string | null, alt: string) => void }) {
  return (
    <div>
      <p className="mb-1 block text-sm font-medium text-ink">{label}</p>
      <ImagePicker value={value} onChange={onChange} aspect={aspect} onCredit={onCredit} />
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
