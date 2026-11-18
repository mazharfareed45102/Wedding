// Choices shown in the event form. Shared by the client and the server so the
// server can validate what it receives.

export const EVENT_TYPES = [
  "Mehndi",
  "Haldi / Mayun",
  "Dholki",
  "Sangeet",
  "Nikah",
  "Baraat",
  "Walima / Reception",
  "Engagement",
  "Western ceremony",
  "Bridal shower",
] as const;

export const STYLES = [
  "Let the designer choose",
  "Traditional",
  "Royal / Mughal",
  "Modern minimal",
  "Floral garden",
  "Boho",
  "Rustic",
  "Pastel dream",
  "Glam & mirrors",
  "Fairy lights & candles",
] as const;

export const BUDGETS = [
  { id: "budget", label: "Budget-friendly", hint: "DIY & smart picks" },
  { id: "moderate", label: "Moderate", hint: "Mix of DIY & rentals" },
  { id: "premium", label: "Premium", hint: "Decorator-led" },
  { id: "luxury", label: "Luxury", hint: "No compromises" },
] as const;

export const SPACE_HINTS = [
  "Let the designer decide",
  "Living room / lounge",
  "Courtyard",
  "Lawn / garden",
  "Rooftop / terrace",
  "House front / gate",
  "Hall / large room",
] as const;

export type BudgetId = (typeof BUDGETS)[number]["id"];

export interface EventDetails {
  event: string;
  styles: string[];
  budget: BudgetId;
  colors: string;
  guests: string;
  location: string;
  spaceHint: string;
  notes: string;
}

export const DEFAULT_DETAILS: EventDetails = {
  event: "Mehndi",
  styles: ["Let the designer choose"],
  budget: "moderate",
  colors: "",
  guests: "",
  location: "",
  spaceHint: "Let the designer decide",
  notes: "",
};
