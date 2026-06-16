export type TireInventoryConfidenceStatus =
  | "verified"
  | "unverified"
  | "stale"
  | "unknown";

export type TireInventorySource = {
  type: "manual" | "csv" | "database" | "api" | "unknown";
  name: string;
};

export type TireInventoryItem = {
  brand: string;
  model: string | null;
  modelKnown: boolean;
  size: string;
  loadIndex: string | null;
  speedRating: string | null;
  quantity: number | null;
  price: number | null;
  source: TireInventorySource;
  updatedAt: string | null;
  confidenceStatus: TireInventoryConfidenceStatus;
};

export type TireInventoryLookupInput = {
  size?: string | null;
  brand?: string | null;
  model?: string | null;
  loadIndex?: string | null;
  speedRating?: string | null;
};

export type TireInventoryProvider = {
  source: TireInventorySource;
  lookup(input: TireInventoryLookupInput): Promise<TireInventoryItem[]>;
};
