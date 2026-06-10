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
  tier: TireTier;
  tire: TireModelKnowledge | null;
  score: number;
  explanation: string;
  matchReason: string;
};

export type TireRecommendationSet = {
  budget: TireRecommendation;
  mid: TireRecommendation;
  premium: TireRecommendation;
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

  if (profile.monthlyMileage === "high") {
    score += tire.longevityScore * 2;
  }

  if (profile.monthlyMileage === "low" && profile.priority === "price") {
    score += tire.tier === "budget" ? 8 : tire.tier === "mid" ? 4 : 0;
  }

  if (profile.replacementReason === "noise") {
    score += tire.quietScore * 2;
  }

  if (profile.evVehicle) {
    score += tire.quietScore * 2;
    score += tire.evSuitable ? 6 : -2;
  }

  if (profile.tireCount === 4 && profile.priority === "price") {
    score += tire.valueScore * 2;
  }

  return score;
}

function isUnsuitable(tire: TireModelKnowledge, profile: RecommendationProfile) {
  if (profile.drivingStyle === "sporty" && tire.tier === "budget" && tire.wetGripScore < 4) return true;
  if (profile.evVehicle && tire.quietScore < 3) return true;
  if (profile.priority === "comfort" && tire.comfortScore < 3) return true;
  if (profile.priority === "quiet" && tire.quietScore < 3) return true;
  return false;
}

function buildExplanation(tire: TireModelKnowledge | null, tier: TireTier, profile: RecommendationProfile) {
  if (!tire) {
    return {
      explanation:
        "אין עדיין דגם מתאים בקטגוריה הזו בבסיס הידע של Tyrei. עדיף לא להמציא דגם לפני שמוסיפים מידע מסודר.",
      matchReason:
        "Tyrei משתמש כרגע רק בדגמים שנמצאים בבסיס הידע המקומי, ולכן הקטגוריה הזו תושלם בהמשך.",
    };
  }

  const reasons: string[] = [];

  if (profile.priority === "price") reasons.push("המחיר חשוב ללקוח, לכן ניתן משקל גבוה לתמורה");
  if (profile.priority === "comfort") reasons.push("הלקוח מחפש נוחות, לכן נבדק ציון הנוחות");
  if (profile.priority === "quiet") reasons.push("שקט חשוב כאן, לכן נבדק ציון הרעש/שקט");
  if (profile.priority === "grip") reasons.push("אחיזה חשובה, לכן נבדק ציון האחיזה ברטוב");
  if (profile.priority === "longevity") reasons.push("אורך חיים חשוב, לכן נבדקה עמידות יחסית");
  if (profile.drivingStyle === "sporty") reasons.push("הנהיגה ספורטיבית יותר, ולכן נמנעים מהמלצה חלשה מדי");
  if (profile.monthlyMileage === "high") reasons.push("הנסועה גבוהה, לכן יש חשיבות לעמידות");
  if (profile.evVehicle) reasons.push("הרכב חשמלי, לכן שקט ונוחות קיבלו משקל גבוה יותר");
  if (profile.tireCount === 4) reasons.push("בהחלפת רביעייה יש משמעות גבוהה יותר לתמורה הכוללת");

  const explanation =
    tier === "budget"
      ? "אפשרות חסכונית יחסית מתוך בסיס הידע הקיים."
      : tier === "mid"
        ? "אפשרות ביניים שמנסה לאזן בין מחיר, נוחות וביצועים."
        : "אפשרות פרימיום למי שמעדיף איכות, שקט וביטחון על פני מחיר נמוך.";

  return {
    explanation,
    matchReason: reasons.length > 0 ? reasons.join(". ") + "." : "נבחר לפי התאמה כללית לפרופיל הלקוח.",
  };
}

function pickBestForTier(tier: TireTier, profile: RecommendationProfile): TireRecommendation {
  const candidates = tireKnowledgeBase
    .filter((tire) => tire.tier === tier)
    .filter((tire) => !isUnsuitable(tire, profile))
    .map((tire) => ({ tire, score: scoreTire(tire, profile) }))
    .sort((left, right) => right.score - left.score);

  const best = candidates[0] ?? null;
  const tire = best?.tire ?? null;
  const score = best?.score ?? 0;
  const { explanation, matchReason } = buildExplanation(tire, tier, profile);

  return {
    tier,
    tire,
    score,
    explanation,
    matchReason,
  };
}

export function recommendTires(profile: RecommendationProfile): TireRecommendationSet {
  return {
    budget: pickBestForTier("budget", profile),
    mid: pickBestForTier("mid", profile),
    premium: pickBestForTier("premium", profile),
  };
}
