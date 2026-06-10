import type { ConversationProfile } from "@/lib/conversation-state";
import type { TireRecommendationSet } from "@/lib/recommendation-engine";

type ConversationMessage = {
  role: string;
  content: string;
};

export type RecommendationDirection = "budget" | "mid" | "premium" | "undecided";
export type ConfidenceTrend = "increasing" | "stable" | "decreasing" | "unknown";

export type RecommendationHistoryItem = {
  direction: RecommendationDirection;
  reason: string;
  confidenceLevel: "low" | "medium" | "high";
};

export type ConversationMemory = {
  currentDirection: RecommendationDirection;
  confidenceTrend: ConfidenceTrend;
  lockedPriorities: string[];
  discussedConcerns: string[];
  recommendationHistory: RecommendationHistoryItem[];
  unresolvedQuestions: string[];
};

type UpdateConversationMemoryInput = {
  messages: ConversationMessage[];
  structuredProfile: ConversationProfile;
  recommendations: TireRecommendationSet;
};

const confidenceValue = {
  low: 1,
  medium: 2,
  high: 3,
} as const;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[׳'"`.,!?;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getUserText(messages: ConversationMessage[]) {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ");
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function unique(values: string[]) {
  return [...new Set(values)].filter(Boolean);
}

function inferDirection(profile: ConversationProfile): RecommendationDirection {
  if (
    profile.priority === "price" ||
    profile.budgetSensitivity === "high" ||
    (profile.monthlyMileage === "low" && profile.drivingStyle !== "sporty")
  ) {
    return "budget";
  }

  if (
    profile.drivingStyle === "sporty" ||
    profile.priority === "grip" ||
    profile.budgetSensitivity === "low"
  ) {
    return "premium";
  }

  if (
    profile.priority === "quiet" ||
    profile.priority === "longevity" ||
    profile.priority === "balance" ||
    profile.monthlyMileage === "high"
  ) {
    return "mid";
  }

  return "undecided";
}

function directionReason(direction: RecommendationDirection, profile: ConversationProfile) {
  if (direction === "budget") {
    if (profile.priority === "price" || profile.budgetSensitivity === "high") return "הלקוח רגיש למחיר או ביקש פתרון חסכוני.";
    return "הנסועה נראית נמוכה, ולכן אין סיבה לדחוף פרימיום בלי צורך ברור.";
  }

  if (direction === "premium") {
    if (profile.drivingStyle === "sporty") return "הלקוח מתאר נהיגה ספורטיבית, לכן צריך להיזהר מצמיג חלש מדי.";
    if (profile.priority === "grip") return "הלקוח שם דגש על אחיזה ובלימה.";
    return "נראה שהלקוח פתוח לאיכות גבוהה יותר אם היא מוצדקת.";
  }

  if (direction === "mid") {
    if (profile.priority === "quiet") return "הלקוח שם דגש על שקט ונוחות, לרוב כדאי להתחיל מאיזון טוב.";
    if (profile.monthlyMileage === "high") return "נסועה גבוהה מצדיקה יותר משקל לעמידות ולאיכות.";
    return "המידע מצביע על איזון בין מחיר, איכות ושימוש יומיומי.";
  }

  return "עדיין חסר מידע כדי לנעול כיוון המלצה.";
}

function inferDirectionConfidence(
  direction: RecommendationDirection,
  profile: ConversationProfile,
  recommendations: TireRecommendationSet,
) {
  if (direction === "undecided") return "low";

  const recommendation = recommendations[direction];
  if (!recommendation) return "low";

  if (profile.confidence >= 0.8 && recommendation.confidenceLevel === "high") return "high";
  if (profile.confidence >= 0.6 && recommendation.confidenceLevel !== "low") return "medium";
  return "low";
}

function getLockedPriorities(profile: ConversationProfile) {
  const priorities: string[] = [];

  if (profile.priority && profile.priority !== "unknown") priorities.push(`priority:${profile.priority}`);
  if (profile.budgetSensitivity && profile.budgetSensitivity !== "unknown") {
    priorities.push(`budgetSensitivity:${profile.budgetSensitivity}`);
  }
  if (profile.drivingStyle && profile.drivingStyle !== "unknown") priorities.push(`drivingStyle:${profile.drivingStyle}`);
  if (profile.monthlyMileage && profile.monthlyMileage !== "unknown") priorities.push(`monthlyMileage:${profile.monthlyMileage}`);
  if (profile.replacementReason && profile.replacementReason !== "unknown") {
    priorities.push(`replacementReason:${profile.replacementReason}`);
  }
  if (profile.tireCount && profile.tireCount !== "unknown") priorities.push(`tireCount:${profile.tireCount}`);

  return priorities;
}

function getDiscussedConcerns(messages: ConversationMessage[]) {
  const text = normalizeText(getUserText(messages));
  const concerns: string[] = [];

  if (hasAny(text, ["זול", "מחיר", "תקציב", "חסכוני"])) concerns.push("מחיר");
  if (hasAny(text, ["שקט", "רעש", "מרעיש", "נוחות"])) concerns.push("שקט ונוחות");
  if (hasAny(text, ["אחיזה", "גשם", "בלימה", "בטיחות"])) concerns.push("אחיזה ובטיחות");
  if (hasAny(text, ["מחזיק", "אורך חיים", "עמיד", "שחיקה"])) concerns.push("אורך חיים ושחיקה");
  if (hasAny(text, ["טסלה", "tesla", "חשמלי", "ev"])) concerns.push("התאמה לרכב חשמלי");
  if (hasAny(text, ["טסט", "רישוי"])) concerns.push("בדיקת טסט והתאמה חוקית");
  if (hasAny(text, ["פנצ", "תקר"])) concerns.push("החלפה בגלל פנצ׳ר");
  if (hasAny(text, ["ספורטיבי", "לוחץ", "מהר"])) concerns.push("נהיגה ספורטיבית");
  if (hasAny(text, ["לא בטוח", "שניים", "2", "ארבע", "4", "כולם"])) concerns.push("כמות צמיגים להחלפה");

  return unique(concerns);
}

function inferPreviousDirections(messages: ConversationMessage[]): RecommendationHistoryItem[] {
  return messages
    .filter((message) => message.role === "tyrei")
    .flatMap((message) => {
      const text = normalizeText(message.content);
      const items: RecommendationHistoryItem[] = [];

      if (hasAny(text, ["חסכוני", "budget", "זול"])) {
        items.push({ direction: "budget", reason: "Tyrei כבר דיבר על כיוון חסכוני.", confidenceLevel: "low" });
      }
      if (hasAny(text, ["משתלם", "mid", "ביניים", "מאוזן"])) {
        items.push({ direction: "mid", reason: "Tyrei כבר דיבר על כיוון ביניים מאוזן.", confidenceLevel: "low" });
      }
      if (hasAny(text, ["פרימיום", "premium", "יקר"])) {
        items.push({ direction: "premium", reason: "Tyrei כבר דיבר על כיוון פרימיום.", confidenceLevel: "low" });
      }

      return items;
    })
    .slice(-3);
}

function inferConfidenceTrend(history: RecommendationHistoryItem[]) {
  if (history.length < 2) return "unknown";

  const previous = confidenceValue[history[history.length - 2].confidenceLevel];
  const current = confidenceValue[history[history.length - 1].confidenceLevel];

  if (current > previous) return "increasing";
  if (current < previous) return "decreasing";
  return "stable";
}

export function updateConversationMemory({
  messages,
  structuredProfile,
  recommendations,
}: UpdateConversationMemoryInput): ConversationMemory {
  const currentDirection = inferDirection(structuredProfile);
  const currentConfidence = inferDirectionConfidence(currentDirection, structuredProfile, recommendations);
  const previousHistory = inferPreviousDirections(messages);
  const currentHistoryItem: RecommendationHistoryItem = {
    direction: currentDirection,
    reason: directionReason(currentDirection, structuredProfile),
    confidenceLevel: currentConfidence,
  };
  const recommendationHistory = [...previousHistory, currentHistoryItem].slice(-4);

  return {
    currentDirection,
    confidenceTrend: inferConfidenceTrend(recommendationHistory),
    lockedPriorities: getLockedPriorities(structuredProfile),
    discussedConcerns: getDiscussedConcerns(messages),
    recommendationHistory,
    unresolvedQuestions: structuredProfile.missingFields,
  };
}
