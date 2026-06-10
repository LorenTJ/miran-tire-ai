export type TireTier = "budget" | "mid" | "premium";

export type DrivingStyle = "relaxed" | "normal" | "sporty" | "mixed";

export type ConfidenceLevel = "low" | "medium" | "high";

export type TireModelKnowledge = {
  id: string;
  brand: string;
  model: string;
  tier: TireTier;
  suitableFor: string[];
  notIdealFor: string[];
  strengths: string[];
  weaknesses: string[];
  drivingStyle: DrivingStyle;
  comfortScore: 1 | 2 | 3 | 4 | 5;
  quietScore: 1 | 2 | 3 | 4 | 5;
  wetGripScore: 1 | 2 | 3 | 4 | 5;
  longevityScore: 1 | 2 | 3 | 4 | 5;
  valueScore: 1 | 2 | 3 | 4 | 5;
  evSuitable: boolean;
  notesForTyrei: string;
  confidence: ConfidenceLevel;
  sources: string[];
};

export const tireBrandTiers: Record<TireTier, string[]> = {
  budget: [
    "ILINK",
    "FRONWAY",
    "TRISTAR",
    "GRENLANDER",
    "AUTOGREEN",
    "SUNFULL",
    "FULLRUN",
    "ONYX",
    "ROADX",
    "APLUS",
    "KAPSEN",
    "ZMAX",
    "INVOVIC",
  ],
  mid: ["Kumho", "Dunlop", "Nexen", "Toyo", "Fulda", "Falken"],
  premium: ["Michelin", "Hankook", "Pirelli", "Continental", "Bridgestone"],
};

export const tireKnowledgeBase: TireModelKnowledge[] = [
  {
    id: "kumho-ecsta-ps71",
    brand: "Kumho",
    model: "Ecsta PS71",
    tier: "mid",
    suitableFor: ["נהיגה יומיומית", "נהיגה רגילה", "לקוחות שמחפשים איזון בין מחיר לביצועים"],
    notIdealFor: ["לקוחות שמחפשים את האפשרות הזולה ביותר", "לקוחות שמבקשים צמיג פרימיום בלבד"],
    strengths: ["איזון טוב לקטגוריית ביניים", "מתאים לנהגים שמחפשים תמורה טובה"],
    weaknesses: ["לא להציג כצמיג פרימיום", "לא להבטיח נתוני ביצועים ללא מקור רשמי"],
    drivingStyle: "normal",
    comfortScore: 3,
    quietScore: 3,
    wetGripScore: 3,
    longevityScore: 3,
    valueScore: 4,
    evSuitable: false,
    notesForTyrei: "הצג כאפשרות Mid מאוזנת ושמרנית. אל תטען טענות ספציפיות על בלימה, רעש או חיסכון בלי מקור.",
    confidence: "low",
    sources: [],
  },
  {
    id: "dunlop-sport-maxx-060-plus",
    brand: "Dunlop",
    model: "Sport Maxx 060+",
    tier: "mid",
    suitableFor: ["נהיגה רגילה עד דינמית", "לקוחות שמחפשים תחושה מעט ספורטיבית יותר"],
    notIdealFor: ["לקוחות שמעדיפים צמיג תקציבי", "לקוחות שמבקשים מקסימום שקט ונוחות"],
    strengths: ["מותג ביניים מוכר", "יכול להתאים לנהגים שרוצים יותר תחושת כביש"],
    weaknesses: ["לא להציג כבחירת נוחות שקטה ביותר", "לא להבטיח התאמה לרכב חשמלי ללא בדיקה"],
    drivingStyle: "mixed",
    comfortScore: 3,
    quietScore: 3,
    wetGripScore: 3,
    longevityScore: 3,
    valueScore: 4,
    evSuitable: false,
    notesForTyrei: "הצג כאפשרות Mid עם אופי מעט יותר דינמי. שמור על ניסוח זהיר ולא טכני מדי.",
    confidence: "low",
    sources: [],
  },
  {
    id: "michelin-primacy-4-plus",
    brand: "Michelin",
    model: "Primacy 4+",
    tier: "premium",
    suitableFor: ["לקוחות שמעדיפים נוחות", "נהיגה רגועה", "לקוחות שמחפשים מותג פרימיום"],
    notIdealFor: ["לקוחות שמחפשים את המחיר הנמוך ביותר", "נהיגה ספורטיבית מאוד"],
    strengths: ["מותג פרימיום", "מתאים לשיחה על נוחות וביטחון כללי"],
    weaknesses: ["מחיר צפוי להיות גבוה יותר", "לא להבטיח ביצועים ספציפיים ללא מקור"],
    drivingStyle: "relaxed",
    comfortScore: 4,
    quietScore: 4,
    wetGripScore: 4,
    longevityScore: 4,
    valueScore: 3,
    evSuitable: false,
    notesForTyrei: "הצג כבחירת Premium רגועה ונוחה. אל תציג כצמיג EV ייעודי ללא אימות נוסף.",
    confidence: "low",
    sources: [],
  },
  {
    id: "continental-premiumcontact-6",
    brand: "Continental",
    model: "PremiumContact 6",
    tier: "premium",
    suitableFor: ["לקוחות שמחפשים צמיג פרימיום", "נהיגה רגילה", "איזון בין נוחות לאחיזה"],
    notIdealFor: ["לקוחות שמחפשים אפשרות תקציבית", "לקוחות שמבקשים צמיג ספורט קיצוני"],
    strengths: ["מותג פרימיום", "מתאים כהמלצה מאוזנת בקטגוריית Premium"],
    weaknesses: ["עלות גבוהה יחסית לאפשרויות Mid או Budget", "לא להבטיח נתוני ביצועים ללא מקור"],
    drivingStyle: "mixed",
    comfortScore: 4,
    quietScore: 4,
    wetGripScore: 4,
    longevityScore: 4,
    valueScore: 3,
    evSuitable: false,
    notesForTyrei: "הצג כאפשרות Premium מאוזנת. ודא שהמידה החוקית מגיעה מהרכב ולא מהמודל.",
    confidence: "low",
    sources: [],
  },
];
