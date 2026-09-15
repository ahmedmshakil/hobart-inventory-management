"use client";

import { useState } from "react";
import { presetRange } from "@/lib/dates";
import type { DateRange, RangePreset } from "@/lib/types";

export function useRange(initial: RangePreset = "last30") {
  const [preset, setPreset] = useState<RangePreset>(initial);
  const [range, setRange] = useState<DateRange>(() => presetRange(initial));
  const onChange = (p: RangePreset, r: DateRange) => {
    setPreset(p);
    setRange(r);
  };
  return { preset, range, onChange };
}
