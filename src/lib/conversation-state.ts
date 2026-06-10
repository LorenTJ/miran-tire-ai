type ConversationMessage = {
  role: string;
  content: string;
};

export type ConversationProfile = {
  tireCount?: number | "unknown";
  replacementReason?: "wear" | "puncture" | "noise" | "test" | "other" | "unknown";
  monthlyMileage?: "low" | "medium" | "high" | "unknown";
  priority?: "price" | "quiet" | "grip" | "longevity" | "balance" | "unknown";
  drivingStyle?: "relaxed" | "normal" | "sporty" | "unknown";
  budgetSensitivity?: "low" | "medium" | "high" | "unknown";
  confidence: number;
  missingFields: string[];
};

const importantFields = [
  "tireCount",
  "replacementReason",
  "monthlyMileage",
  "priority",
  "drivingStyle",
] as const;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[״"׳'`.,!?;:()[\]{}]/g, " ")
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

function hasStandaloneNumber(text: string, value: number) {
  return new RegExp(`(^|\\D)${value}(\\D|$)`).test(text);
}

function extractNumbers(text: string) {
  return text.match(/\d+/g)?.map(Number) ?? [];
}

function extractTireCount(text: string): ConversationProfile["tireCount"] {
  if (hasAny(text, ["לא בטוח", "לא יודע", "אין לי מושג"])) return "unknown";
  if (hasStandaloneNumber(text, 4) || hasAny(text, ["ארבע", "כולם", "כל הצמיגים", "רביעייה"])) return 4;
  if (hasStandaloneNumber(text, 2) || hasAny(text, ["שניים", "שני", "זוג", "קדמיים", "אחוריים"])) return 2;
  if (hasStandaloneNumber(text, 1) || hasAny(text, ["אחד", "אחת", "בודד"])) return 1;
  return "unknown";
}

function extractReplacementReason(text: string): ConversationProfile["replacementReason"] {
  if (hasAny(text, ["פנצ׳ר", "פנצ'ר", "פנצר", "תקר"])) return "puncture";
  if (text.includes("טסט")) return "test";
  if (hasAny(text, ["רעש", "מרעיש", "רעשים"])) return "noise";
  if (hasAny(text, ["שחיקה", "שחוק", "גמור", "גמורים", "יבש", "יבשים", "ישן", "ישנים"])) return "wear";
  if (hasAny(text, ["אחר", "משהו אחר"])) return "other";
  return "unknown";
}

function extractMonthlyMileage(text: string): ConversationProfile["monthlyMileage"] {
  const numbers = extractNumbers(text);

  if (hasAny(text, ["מעט", "כמעט לא נוסע", "עד 500", "פחות מ 500", "פחות מ-500"])) return "low";
  if (hasAny(text, ["הרבה", "כביש 6", "נסיעות ארוכות"])) return "high";
  if (numbers.some((number) => number >= 2000)) return "high";
  if (numbers.some((number) => number === 1000 || number === 1500 || (number > 500 && number < 2000))) return "medium";
  if (numbers.some((number) => number > 0 && number <= 500)) return "low";

  return "unknown";
}

function extractPriority(text: string): ConversationProfile["priority"] {
  if (hasAny(text, ["זול", "מחיר", "תקציב", "חסכוני"])) return "price";
  if (hasAny(text, ["שקט", "נוחות", "נוח", "רך"])) return "quiet";
  if (hasAny(text, ["אחיזה", "גשם", "בלימה", "בטיחות"])) return "grip";
  if (hasAny(text, ["מחזיק", "אורך חיים", "עמיד", "עמידות", "זמן"])) return "longevity";
  if (hasAny(text, ["איזון", "מאוזן", "הכל חשוב"])) return "balance";
  return "unknown";
}

function extractBudgetSensitivity(text: string): ConversationProfile["budgetSensitivity"] {
  if (hasAny(text, ["זול", "מחיר", "תקציב", "כמה שפחות", "חסכוני"])) return "high";
  if (hasAny(text, ["פרימיום", "הכי טוב", "לא משנה מחיר"])) return "low";
  if (hasAny(text, ["משתלם", "איזון", "מאוזן"])) return "medium";
  return "unknown";
}

function extractDrivingStyle(text: string): ConversationProfile["drivingStyle"] {
  if (hasAny(text, ["ספורטיבי", "ספורט", "לוחץ", "מהר", "מהיר", "חזק"])) return "sporty";
  if (hasAny(text, ["לא נוסע מהר", "רגוע", "לאט", "נהיגה רגועה"])) return "relaxed";
  if (hasAny(text, ["רגיל", "נורמלי", "ממוצע"])) return "normal";
  return "unknown";
}

export function extractConversationProfile(messages: ConversationMessage[]): ConversationProfile {
  const text = normalizeText(getUserText(messages));

  const profile: ConversationProfile = {
    tireCount: extractTireCount(text),
    replacementReason: extractReplacementReason(text),
    monthlyMileage: extractMonthlyMileage(text),
    priority: extractPriority(text),
    drivingStyle: extractDrivingStyle(text),
    budgetSensitivity: extractBudgetSensitivity(text),
    confidence: 0,
    missingFields: [],
  };

  profile.missingFields = importantFields.filter((field) => {
    const value = profile[field];
    return value === undefined || value === "unknown";
  });

  const knownFields = importantFields.length - profile.missingFields.length;
  profile.confidence = Number((knownFields / importantFields.length).toFixed(2));

  return profile;
}
