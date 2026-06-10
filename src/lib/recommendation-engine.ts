import { tireKnowledgeBase, type TireModelKnowledge, type TireTier } from "@/data/tire-knowledge";

export type RecommendationProfile = {
  drivingStyle: "relaxed" | "normal" | "sporty" | "mixed" | "unknown";
  priority: "price" | "comfort" | "quiet" | "grip" | "longevity" | "balanced" | "unknown";
  monthlyMileage: "low" | "medium" | "high" | "unknown";
  replacementReason: "wear" | "puncture" | "noise" | "test" | "other" | "unknown";
  vehicleType: "private" | "suv" | "commercial" | "unknown";
  evVehicle: boolean;
  tireCount: 1 | 2 | 4 | "unknown";
};

export type TireRecommendation = {
  category: TireTier;
  tier: TireTier;
  tire: TireModelKnowledge | null;
  tireModel: string;
  price: string;
  score: number;
  mainReason: string;
  tradeoffs: string;
  whyNotCheaper: string;
  whyNotMoreExpensive: string;
  confidence: "low" | "medium" | "high";
  confidenceLevel: "low" | "medium" | "high";
  assumptionsMade: string[];
  missingInformationImpact?: string;
  bestFor: string[];
  notIdealFor: string[];
  explanation: string;
  matchReason: string;
};

export type TireRecommendationSet = {
  budget: TireRecommendation;
  mid: TireRecommendation;
  premium: TireRecommendation;
};

const fallbackPrices: Record<TireTier, string> = {
  budget: "מחיר יימסר לאחר בדיקת זמינות",
  mid: "₪590-₪690",
  premium: "₪990+",
};

function scoreTire(tire: TireModelKnowledge, profile: RecommendationProfile) {
  let score = 0;

  score += tire.valueForMoneyLevel * 2;
  score += tire.comfortLevel;
  score += tire.quietnessLevel;
  score += tire.wetGripLevel;
  score += tire.longevityLevel;

  if (profile.priority === "price") score += tire.valueForMoneyLevel * 3;
  if (profile.priority === "comfort") score += tire.comfortLevel * 3;
  if (profile.priority === "quiet") score += tire.quietnessLevel * 3;
  if (profile.priority === "grip") score += tire.wetGripLevel * 3;
  if (profile.priority === "longevity") score += tire.longevityLevel * 3;
  if (profile.priority === "balanced") {
    score += tire.valueForMoneyLevel + tire.comfortLevel + tire.quietnessLevel + tire.wetGripLevel;
  }

  if (profile.drivingStyle === "sporty") {
    score += tire.sportinessLevel >= 7 ? 6 : -4;
    if (tire.tier === "budget") score -= 8;
  }

  if (profile.drivingStyle === "relaxed") {
    score += tire.comfortLevel + tire.quietnessLevel;
  }

  if (profile.monthlyMileage === "high") score += tire.longevityLevel * 2;
  if (profile.monthlyMileage === "low" && profile.priority === "price") {
    score += tire.tier === "budget" ? 8 : tire.tier === "mid" ? 4 : 0;
  }
  if (profile.replacementReason === "noise") score += tire.quietnessLevel * 2;
  if (profile.evVehicle) {
    score += tire.quietnessLevel * 2;
    score += tire.evCompatible ? 6 : -2;
  }
  if (profile.tireCount === 4 && profile.priority === "price") score += tire.valueForMoneyLevel * 2;

  return score;
}

function isUnsuitable(tire: TireModelKnowledge, profile: RecommendationProfile) {
  if (profile.drivingStyle === "sporty" && tire.tier === "budget" && tire.wetGripLevel < 6) return true;
  if (profile.evVehicle && tire.quietnessLevel < 5) return true;
  if (profile.priority === "comfort" && tire.comfortLevel < 5) return true;
  if (profile.priority === "quiet" && tire.quietnessLevel < 5) return true;
  return false;
}

function inferConfidence(tire: TireModelKnowledge | null, profile: RecommendationProfile): "low" | "medium" | "high" {
  if (!tire) return "low";

  const knownProfileFields = [
    profile.drivingStyle,
    profile.priority,
    profile.monthlyMileage,
    profile.replacementReason,
    profile.tireCount,
  ].filter((value) => value !== "unknown").length;

  if (tire.confidence === "high" && knownProfileFields >= 4) return "high";
  if (knownProfileFields >= 3) return "medium";
  return "low";
}

function profileMissingFields(profile: RecommendationProfile) {
  const missing: string[] = [];

  if (profile.drivingStyle === "unknown") missing.push("סגנון הנהיגה");
  if (profile.priority === "unknown") missing.push("מה הכי חשוב בצמיג");
  if (profile.monthlyMileage === "unknown") missing.push("נסועה חודשית");
  if (profile.replacementReason === "unknown") missing.push("סיבת ההחלפה");
  if (profile.tireCount === "unknown") missing.push("כמה צמיגים צריך להחליף");

  return missing;
}

function assumptionsMade(tire: TireModelKnowledge | null, profile: RecommendationProfile) {
  const assumptions: string[] = [];

  if (!tire) assumptions.push("אין עדיין דגם מאומת בקטגוריה הזו בבסיס הידע");
  if (profile.drivingStyle === "unknown") assumptions.push("סגנון הנהיגה לא ידוע");
  if (profile.priority === "unknown") assumptions.push("עדיפות הלקוח לא ברורה");
  if (profile.monthlyMileage === "unknown") assumptions.push("הנסועה החודשית לא ידועה");
  if (profile.replacementReason === "unknown") assumptions.push("סיבת ההחלפה לא ידועה");
  if (profile.tireCount === "unknown") assumptions.push("כמות הצמיגים להחלפה לא ידועה");
  if (profile.evVehicle && tire && !tire.evCompatible) assumptions.push("הרכב חשמלי, אך הצמיג אינו מסומן כ-EV ייעודי בבסיס הידע");
  if (tire?.confidence === "low") assumptions.push("מידע הדגם בבסיס הידע עדיין ברמת ביטחון נמוכה");

  return assumptions;
}

function missingInformationImpact(profile: RecommendationProfile) {
  const missing = profileMissingFields(profile);

  if (missing.length === 0) return undefined;

  return `מידע נוסף על ${missing.join(", ")} יכול לשפר את דיוק ההמלצה.`;
}

function adjustConfidence(
  baseConfidence: "low" | "medium" | "high",
  assumptions: string[],
  closeScoreWarning?: string,
) {
  if (baseConfidence === "low") return "low";
  if (assumptions.length >= 3) return "low";
  if (assumptions.length > 0 || closeScoreWarning) return "medium";
  return baseConfidence;
}

function mainReasonFor(tire: TireModelKnowledge | null, tier: TireTier, profile: RecommendationProfile) {
  if (!tire) return "אין עדיין דגם מאומת בקטגוריה הזו בבסיס הידע המקומי.";
  if (profile.priority === "price" && tier !== "premium") return "זו בחירה שמתעדפת תמורה ועלות סבירה.";
  if (profile.priority === "quiet" || profile.evVehicle) return "זו בחירה שמתחשבת בשקט ונוחות, במיוחד ברכב חשמלי.";
  if (profile.priority === "grip" || profile.drivingStyle === "sporty") return "זו בחירה שמתאימה יותר למי שמחפש אחיזה ותחושת כביש.";
  if (profile.replacementReason === "test") return "זו בחירה שמאזנת בין התאמה חוקית, ערך ושימוש יומיומי.";
  if (profile.monthlyMileage === "high") return "זו בחירה שנותנת משקל לעמידות לאורך זמן.";
  return tier === "premium"
    ? "זו בחירת פרימיום שמעדיפה איכות ושקט על פני מחיר נמוך."
    : "זו בחירה מאוזנת לשימוש יומיומי.";
}

function tradeoffsFor(tire: TireModelKnowledge | null, tier: TireTier) {
  if (!tire) return "החיסרון המרכזי הוא שאין עדיין דגם ספציפי מאומת להצגה.";
  if (tier === "budget") return "החיסכון במחיר עלול לבוא על חשבון שקט, תחושת כביש או אורך חיים.";
  if (tier === "mid") return "זו לא הבחירה הכי זולה ולא הכי יוקרתית, אלא נקודת איזון.";
  return "החיסרון המרכזי הוא מחיר גבוה יותר, שלא תמיד מוצדק לנסועה נמוכה או נהיגה רגועה.";
}

function whyNotCheaperFor(tire: TireModelKnowledge | null, tier: TireTier, profile: RecommendationProfile) {
  if (!tire) return "אי אפשר להשוות לדגם זול יותר בלי דגם מאומת בבסיס הידע.";
  if (tier === "budget") return "זו כבר האפשרות החסכונית ביותר מתוך ההמלצות המובנות כרגע.";
  if (profile.evVehicle) return "ברכב חשמלי צמיג זול מדי עלול להיות פחות מתאים לשקט, משקל ושחיקה.";
  if (profile.drivingStyle === "sporty") return "בנהיגה ספורטיבית לא כדאי לרדת לצמיג חלש מדי באחיזה.";
  if (profile.priority === "quiet" || profile.priority === "comfort") return "צמיג זול יותר עלול להיות פחות שקט או פחות נוח.";
  return "אפשר לרדת במחיר אם התקציב חשוב יותר מהנוחות והתחושה.";
}

function whyNotMoreExpensiveFor(tier: TireTier, profile: RecommendationProfile) {
  if (tier === "premium") return "זו כבר האפשרות היקרה יותר; מעבר לזה לא מוצדק בלי צורך מאוד ספציפי.";
  if (profile.monthlyMileage === "low" && profile.priority === "price") {
    return "בנסועה נמוכה ורגישות למחיר, פרימיום לא תמיד מחזיר את ההפרש.";
  }
  if (profile.drivingStyle === "relaxed" && profile.priority !== "quiet") {
    return "בנהיגה רגועה, לא תמיד צריך לשלם יותר על ביצועים שלא ינוצלו.";
  }
  return "יקר יותר יכול לתת יותר שקט/תחושה, אבל לא תמיד נחוץ לפי הפרופיל.";
}

function bestFor(tire: TireModelKnowledge | null, tier: TireTier, profile: RecommendationProfile) {
  if (!tire) return ["השלמה עתידית של בסיס הידע"];

  const values = [...tire.bestFor];
  if (profile.evVehicle) values.push("רכב חשמלי שבו שקט ונוחות חשובים");
  if (profile.priority === "price") values.push("לקוח שרוצה לשלוט בתקציב");
  if (profile.priority === "grip") values.push("לקוח שמעדיף אחיזה וביטחון");
  if (tier === "mid") values.push("מי שרוצה איזון בין מחיר לאיכות");
  if (tier === "premium") values.push("מי שמוכן לשלם יותר עבור תחושה ושקט");

  return [...new Set(values)].slice(0, 4);
}

function notIdealFor(tire: TireModelKnowledge | null, tier: TireTier, profile: RecommendationProfile) {
  if (!tire) return ["המלצה סופית לפני הוספת דגם מאומת"];

  const values = [...tire.notIdealFor];
  if (tier === "budget" && profile.drivingStyle === "sporty") values.push("נהיגה ספורטיבית");
  if (tier === "premium" && profile.priority === "price") values.push("רגישות גבוהה למחיר");
  if (tier === "premium" && profile.monthlyMileage === "low") values.push("נסועה נמוכה מאוד");

  return [...new Set(values)].slice(0, 4);
}

function buildRecommendation(
  tire: TireModelKnowledge | null,
  tier: TireTier,
  score: number,
  profile: RecommendationProfile,
  closeScoreWarning?: string,
): TireRecommendation {
  const tireModel = tire ? `${tire.brand} ${tire.model}` : "אין דגם מאומת כרגע";
  const mainReason = mainReasonFor(tire, tier, profile);
  const tradeoffs = tradeoffsFor(tire, tier);
  const whyNotCheaper = whyNotCheaperFor(tire, tier, profile);
  const whyNotMoreExpensive = whyNotMoreExpensiveFor(tier, profile);
  const bestForValues = bestFor(tire, tier, profile);
  const notIdealForValues = notIdealFor(tire, tier, profile);
  const assumptions = assumptionsMade(tire, profile);
  const baseConfidence = inferConfidence(tire, profile);
  const confidenceLevel = adjustConfidence(baseConfidence, assumptions, closeScoreWarning);
  const informationImpact = missingInformationImpact(profile);
  const tradeoffsWithUncertainty = closeScoreWarning ? `${tradeoffs} ${closeScoreWarning}` : tradeoffs;

  return {
    category: tier,
    tier,
    tire,
    tireModel,
    price: fallbackPrices[tier],
    score,
    mainReason,
    tradeoffs: tradeoffsWithUncertainty,
    whyNotCheaper,
    whyNotMoreExpensive,
    confidence: confidenceLevel,
    confidenceLevel,
    assumptionsMade: assumptions,
    missingInformationImpact: informationImpact,
    bestFor: bestForValues,
    notIdealFor: notIdealForValues,
    explanation: mainReason,
    matchReason: [mainReason, tradeoffsWithUncertainty].join(" "),
  };
}

function pickBestForTier(tier: TireTier, profile: RecommendationProfile): TireRecommendation {
  const candidates = tireKnowledgeBase
    .filter((tire) => tire.tier === tier)
    .filter((tire) => !isUnsuitable(tire, profile))
    .map((tire) => ({ tire, score: scoreTire(tire, profile) }))
    .sort((left, right) => right.score - left.score);

  const best = candidates[0] ?? null;
  const secondBest = candidates[1] ?? null;
  const closeScoreWarning =
    best && secondBest && Math.abs(best.score - secondBest.score) <= 3
      ? "הפער מול אפשרות אחרת באותה קטגוריה קטן, לכן זו לא בחירה חד-משמעית."
      : undefined;

  return buildRecommendation(best?.tire ?? null, tier, best?.score ?? 0, profile, closeScoreWarning);
}

export function recommendTires(profile: RecommendationProfile): TireRecommendationSet {
  return {
    budget: pickBestForTier("budget", profile),
    mid: pickBestForTier("mid", profile),
    premium: pickBestForTier("premium", profile),
  };
}
