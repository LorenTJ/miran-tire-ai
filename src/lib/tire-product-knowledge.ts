export type TireProductKnowledgeCategory =
  | "budget"
  | "mid-range"
  | "premium"
  | "unknown";

export type TireProductKnowledgeConfidenceStatus =
  | "verified"
  | "unverified"
  | "legacy"
  | "unknown";

export type TireProductKnowledgeSource = {
  type: "manual" | "manufacturer" | "catalog" | "review" | "unknown";
  name: string;
};

export type TireProductSuitability = "yes" | "no" | "limited" | "unknown";

export type TireProductRating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type TireProductKnowledge = {
  brand: string;
  model: string | null;
  modelKnown: boolean;
  category: TireProductKnowledgeCategory;
  strengths: string[];
  weaknesses: string[];
  goodFor: string[];
  avoidFor: string[];
  evSuitability: TireProductSuitability;
  comfortRating: TireProductRating | null;
  noiseRating: TireProductRating | null;
  wetGripRating: TireProductRating | null;
  wearRating: TireProductRating | null;
  source: TireProductKnowledgeSource;
  confidenceStatus: TireProductKnowledgeConfidenceStatus;
  notes: string[];
};

export type TireProductKnowledgeLookupInput = {
  brand?: string | null;
  model?: string | null;
  category?: TireProductKnowledgeCategory | null;
};

export type TireProductKnowledgeProvider = {
  source: TireProductKnowledgeSource;
  lookup(input: TireProductKnowledgeLookupInput): Promise<TireProductKnowledge[]>;
};
