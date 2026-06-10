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

  score += tire.valueScore * 2;
  score += tire.comfortScore;
  score += tire.quietScore;
  score += tire.wetGripScore;
  score += tire.longevityScore;

  if (profile.priority === "price") score += tire.valueScore * 3;
  if (profile.priority === "comfort") score += tire.comfortScore * 3;
  if (profile.priority === "quiet") score += tire.quietScore * 3;
  if (profile.priority === "grip") score += tire.wetGripScore * 3;
  if (profile.priority === "longevity") score += tire.longevityScore * 3;
  if (profile.priority === "balanced") {
    score += tire.valueScore + tire.comfortScore + tire.quietScore + tire.wetGripScore;
  }

  if (profile.drivingStyle === "sporty") {
    score += tire.drivingStyle === "sporty" || tire.drivingStyle === "mixed" ? 6 : -4;
    if (tire.tier === "budget") score -= 8;
  }

  if (profile.drivingStyle === "relaxed") {
    score += tire.comfortScore + tire.quietScore;
  }

  if (profile.monthlyMileage === "high") score += tire.longevityScore * 2;
  if (profile.monthlyMileage === "low" && profile.priority === "price") {
    score += tire.tier === "budget" ? 8 : tire.tier === "mid" ? 4 : 0;
  }
  if (profile.replacementReason === "noise") score += tire.quietScore * 2;
  if (profile.evVehicle) {
    score += tire.quietScore * 2;
    score += tire.evSuitable ? 6 : -2;
  }
  if (profile.tireCount === 4 && profile.priority === "price") score += tire.valueScore * 2;

  return score;
}

function isUnsuitable(tire: TireModelKnowledge, profile: RecommendationProfile) {
  if (profile.drivingStyle === "sporty" && tire.tier === "budget" && tire.wetGripScore < 4) return true;
  if (profile.evVehicle && tire.quietScore < 3) return true;
  if (profile.priority === "comfort" && tire.comfortScore < 3) return true;
  if (profile.priority === "quiet" && tire.quietScore < 3) return true;
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

  const values = [...tire.suitableFor];
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

function buildRecommendation(tire: TireModelKnowledge | null, tier: TireTier, score: number, profile: RecommendationProfile): TireRecommendation {
  const tireModel = tire ? `${tire.brand} ${tire.model}` : "אין דגם מאומת כרגע";
  const mainReason = mainReasonFor(tire, tier, profile);
  const tradeoffs = tradeoffsFor(tire, tier);
  const whyNotCheaper = whyNotCheaperFor(tire, tier, profile);
  const whyNotMoreExpensive = whyNotMoreExpensiveFor(tier, profile);
  const bestForValues = bestFor(tire, tier, profile);
  const notIdealForValues = notIdealFor(tire, tier, profile);

  return {
    category: tier,
    tier,
    tire,
    tireModel,
    price: fallbackPrices[tier],
    score,
    mainReason,
    tradeoffs,
    whyNotCheaper,
    whyNotMoreExpensive,
    confidence: inferConfidence(tire, profile),
    bestFor: bestForValues,
    notIdealFor: notIdealForValues,
    explanation: mainReason,
    matchReason: [mainReason, tradeoffs].join(" "),
  };
}

function pickBestForTier(tier: TireTier, profile: RecommendationProfile): TireRecommendation {
  const candidates = tireKnowledgeBase
    .filter((tire) => tire.tier === tier)
    .filter((tire) => !isUnsuitable(tire, profile))
    .map((tire) => ({ tire, score: scoreTire(tire, profile) }))
    .sort((left, right) => right.score - left.score);

  const best = candidates[0] ?? null;
  return buildRecommendation(best?.tire ?? null, tier, best?.score ?? 0, profile);
}

export function recommendTires(profile: RecommendationProfile): TireRecommendationSet {
  return {
    budget: pickBestForTier("budget", profile),
    mid: pickBestForTier("mid", profile),
    premium: pickBestForTier("premium", profile),
  };
}
