import { fitmentInsights, type FitmentConfidence, type FitmentWarning } from "@/data/fitment-rules";
import type { ConversationProfile } from "@/lib/conversation-state";

type Vehicle = {
  model: string;
  year: number;
  tireSize: string;
  plateNumber: string;
};

export type FitmentAnalysis = {
  fitmentConfidence: FitmentConfidence;
  possibleRequirements: string[];
  warnings: FitmentWarning[];
  recommendedChecks: string[];
  notes: string[];
};

function isTesla(vehicle: Vehicle) {
  const model = vehicle.model.toLowerCase();
  return model.includes("tesla") || model.includes("טסלה");
}

function isEv(vehicle: Vehicle) {
  const model = vehicle.model.toLowerCase();
  return isTesla(vehicle) || model.includes("electric") || model.includes("ev") || model.includes("חשמלי");
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function insight(appliesTo: "ev" | "tesla" | "runflat" | "sporty" | "unknown") {
  return fitmentInsights.filter((item) => item.appliesTo === appliesTo);
}

export function analyzeFitment({
  vehicle,
  conversationProfile,
}: {
  vehicle: Vehicle;
  conversationProfile: ConversationProfile;
}): FitmentAnalysis {
  const possibleRequirements: string[] = [];
  const warnings: FitmentWarning[] = [];
  const recommendedChecks: string[] = [
    "בדוק את מידת הצמיג שמופיעה על הדופן של הצמיג הנוכחי.",
    "בדוק load index ו-speed rating על הדופן לפני הזמנה.",
    "בדוק האם מופיע סימון XL / Reinforced / RunFlat.",
  ];
  const notes: string[] = [
    `מידת הצמיג הידועה כרגע מגיעה מהרכב בלבד: ${vehicle.tireSize}.`,
    "אין להסיק מפרט OE מלא ללא בדיקה פיזית או מקור יצרן.",
  ];

  let confidence: FitmentConfidence = "medium";

  if (isEv(vehicle)) {
    for (const item of insight("ev")) {
      possibleRequirements.push(item.possibleRequirement);
      notes.push(item.note);
    }
    recommendedChecks.push("ברכב חשמלי, ודא שהצמיג מתאים לעומס ולשקט הנדרש לפי הסימון הקיים.");
  }

  if (isTesla(vehicle)) {
    for (const item of insight("tesla")) {
      possibleRequirements.push(item.possibleRequirement);
      notes.push(item.note);
    }
  }

  if (conversationProfile.drivingStyle === "sporty") {
    for (const item of insight("sporty")) {
      possibleRequirements.push(item.possibleRequirement);
      notes.push(item.note);
    }
    recommendedChecks.push("בנהיגה ספורטיבית, ודא שלא יורדים מדירוג העומס או המהירות שמופיע על הצמיג הקיים.");
  }

  if (conversationProfile.missingFields.length > 0) {
    confidence = "low";
    warnings.push({
      id: "low-profile-confidence",
      severity: "caution",
      message: "חלק מפרטי השימוש עדיין חסרים, לכן ניתוח ההתאמה הוא ראשוני.",
    });
  }

  for (const item of insight("runflat")) {
    possibleRequirements.push(item.possibleRequirement);
    notes.push(item.note);
  }

  for (const item of insight("unknown")) {
    notes.push(item.note);
  }

  warnings.push({
    id: "no-oe-specs",
    severity: "caution",
    message: "Tyrei לא קובע load index, speed rating, RunFlat, XL או setup קדמי/אחורי ללא בדיקה.",
  });

  if (!vehicle.tireSize) {
    confidence = "low";
    warnings.push({
      id: "missing-tire-size",
      severity: "caution",
      message: "לא קיימת מידת צמיג ידועה מהרכב, ולכן חובה לבצע בדיקה פיזית.",
    });
  }

  return {
    fitmentConfidence: confidence,
    possibleRequirements: unique(possibleRequirements),
    warnings,
    recommendedChecks: unique(recommendedChecks),
    notes: unique(notes),
  };
}
