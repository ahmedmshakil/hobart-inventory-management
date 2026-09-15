"use client";

import { Badge, type Tone } from "@/components/ui/primitives";
import type { IntakeStatus, LotStatus, OrderStatus, WasteReason } from "@/lib/types";

const INTAKE: Record<IntakeStatus, Tone> = {
  Received: "info",
  "In Processing": "warning",
  Processed: "good",
};
export const IntakeStatusBadge = ({ status }: { status: IntakeStatus }) => (
  <Badge tone={INTAKE[status]}>{status}</Badge>
);

const ORDER: Record<OrderStatus, Tone> = {
  Draft: "neutral",
  Confirmed: "info",
  Packed: "brand",
  "Out for Delivery": "warning",
  Delivered: "good",
  Cancelled: "critical",
};
export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <Badge tone={ORDER[status]}>{status}</Badge>
);

const LOT: Record<LotStatus, Tone> = {
  "In Stock": "good",
  Reserved: "info",
  Sold: "neutral",
  Expired: "critical",
  "Written Off": "critical",
};
export const LotStatusBadge = ({ status }: { status: LotStatus }) => (
  <Badge tone={LOT[status]}>{status}</Badge>
);

const WASTE: Record<WasteReason, Tone> = {
  Trim: "neutral",
  Bone: "neutral",
  Spoilage: "critical",
  Expiry: "warning",
  Damage: "warning",
  "Customer Return": "info",
  "QA Reject": "critical",
};
export const WasteReasonBadge = ({ reason }: { reason: WasteReason }) => (
  <Badge tone={WASTE[reason]}>{reason}</Badge>
);
