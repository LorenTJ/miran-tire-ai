export type FitmentConfidence = "low" | "medium" | "high";

export type FitmentInsight = {
  id: string;
  appliesTo: "ev" | "tesla" | "runflat" | "sporty" | "unknown";
  possibleRequirement: string;
  note: string;
  confidence: FitmentConfidence;
};

export type FitmentWarning = {
  id: string;
  severity: "info" | "caution";
  message: string;
};

export const fitmentInsights: FitmentInsight[] = [
  {
    id: "ev-load-noise",
    appliesTo: "ev",
    possibleRequirement: "XL / reinforced tires may be relevant depending on vehicle configuration.",
    note: "EV vehicles often place more importance on load capacity, road noise, comfort, and wear.",
    confidence: "medium",
  },
  {
    id: "tesla-noise",
    appliesTo: "tesla",
    possibleRequirement: "Quietness and comfort should receive extra attention.",
    note: "Tesla vehicles can make tire road noise more noticeable because the drivetrain is quiet.",
    confidence: "medium",
  },
  {
    id: "possible-runflat",
    appliesTo: "runflat",
    possibleRequirement: "Some vehicles may use RunFlat tires depending on trim and current setup.",
    note: "RunFlat should be verified from the current sidewall or manufacturer data before recommending.",
    confidence: "low",
  },
  {
    id: "sporty-load-speed",
    appliesTo: "sporty",
    possibleRequirement: "Higher load or speed rating may be relevant depending on the original specification.",
    note: "Do not infer exact load index or speed rating without checking the current tire or official fitment data.",
    confidence: "low",
  },
  {
    id: "unknown-configuration",
    appliesTo: "unknown",
    possibleRequirement: "Current sidewall verification is recommended.",
    note: "When configuration is unknown, verify tire size, load index, speed rating, XL/RunFlat marking, and front/rear setup on the vehicle.",
    confidence: "low",
  },
];
