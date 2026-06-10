import OpenAI from "openai";
import { tireKnowledgeBase, tireBrandTiers } from "@/data/tire-knowledge";
import {
  recommendTires,
  type RecommendationProfile,
  type TireRecommendationSet,
} from "@/lib/recommendation-engine";

type ClientMessage = {
  role: "tyrei" | "user";
  content: string;
};

type Vehicle = {
  model: string;
  year: number;
  tireSize: string;
  plateNumber: string;
};

const systemPrompt = `
You are Tyrei, a Hebrew AI tire advisor.
You help Israeli customers choose tires.
Always answer in Hebrew.
Sound like a calm tire expert, not a generic chatbot and not a rigid questionnaire.

Core behavior:
- Infer useful information from free text. Do not ask again for details the user already gave.
- Ask only the next missing important question, one question at a time.
- If the user asks a general tire question, answer it directly and briefly, then continue the fitting flow.
- Keep answers short, practical, and easy to understand.
- Recommendations must explain why they match the customer profile.
- If the user provided enough information, move to Budget / Mid / Premium recommendations.

Safety and business rules:
- Never guess legal tire fitment.
- The legal tire size comes only from the vehicle object.
- Do not claim a tire is in stock unless inventory data explicitly says so. You currently have no live inventory data.
- Do not mention WhatsApp.
- Do not take payment yet.
- Do not say "I am an AI model".
- Do not invent tire model facts.
- Use the structured tire knowledge base and recommendation engine context when recommending tires.
- Do not invent tire models that are not provided in the structured recommendations.

Advisor logic:
- If the user drives little and wants cheap tires, do not push premium. Explain that value/budget can make sense.
- If the vehicle is Tesla or EV, consider quietness, vehicle weight, wear, comfort, and EV suitability.
- If the user says sporty driving, avoid weak budget recommendations and explain why.
- If the reason is a test, focus on legal fitment, tire condition, and value.
- If the user is unsure whether to replace 2 or 4 tires, explain when 2 vs 4 makes sense and ask what condition the other tires are in.
`.trim();

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[״"׳'.,!?]/g, " ").replace(/\s+/g, " ").trim();
}

function lastUserText(messages: ClientMessage[]) {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ");
}

function formatKnownProfile(profile: RecommendationProfile) {
  const missing = [
    profile.tireCount === "unknown" ? "כמה צמיגים צריך להחליף" : null,
    profile.replacementReason === "unknown" ? "סיבת ההחלפה" : null,
    profile.monthlyMileage === "unknown" ? "נסועה חודשית" : null,
    profile.priority === "unknown" ? "מה הכי חשוב בצמיג" : null,
    profile.drivingStyle === "unknown" ? "סגנון נהיגה" : null,
  ].filter(Boolean);

  return [
    `Driving style: ${profile.drivingStyle}`,
    `Priority: ${profile.priority}`,
    `Monthly mileage: ${profile.monthlyMileage}`,
    `Replacement reason: ${profile.replacementReason}`,
    `Vehicle type: ${profile.vehicleType}`,
    `EV vehicle: ${profile.evVehicle ? "yes" : "no"}`,
    `Tire count: ${profile.tireCount}`,
    `Missing important details: ${missing.length > 0 ? missing.join(", ") : "none"}`,
  ].join("\n");
}

function inferProfile(messages: ClientMessage[], vehicle: Vehicle): RecommendationProfile {
  const text = normalizeText(lastUserText(messages));
  const numbers = text.match(/\d+/g)?.map(Number) ?? [];
  const largestNumber = numbers.length ? Math.max(...numbers) : null;
  const evVehicle = /tesla|טסלה|electric|חשמלי/.test(normalizeText(`${vehicle.model} ${text}`));

  return {
    drivingStyle: text.includes("ספורט") || text.includes("לוחץ") || text.includes("מהיר")
      ? "sporty"
      : text.includes("רגוע") || text.includes("לאט")
        ? "relaxed"
        : text.includes("רגיל") || text.includes("נורמלי")
          ? "normal"
          : "unknown",
    priority: text.includes("מחיר") || text.includes("זול") || text.includes("תקציב")
      ? "price"
      : text.includes("שקט") || text.includes("רעש")
        ? "quiet"
        : text.includes("נוחות") || text.includes("נוח")
          ? "comfort"
          : text.includes("אחיזה") || text.includes("בטיחות")
            ? "grip"
            : text.includes("אורך") || text.includes("עמיד")
              ? "longevity"
              : text.includes("איזון") || text.includes("מאוזן")
                ? "balanced"
                : "unknown",
    monthlyMileage: largestNumber === null
      ? text.includes("מעט")
        ? "low"
        : text.includes("הרבה")
          ? "high"
          : "unknown"
      : largestNumber <= 500
        ? "low"
        : largestNumber > 1500
          ? "high"
          : "medium",
    replacementReason: text.includes("שחיק") || text.includes("ישן") || text.includes("גמור")
      ? "wear"
      : text.includes("פנצ") || text.includes("תקר")
        ? "puncture"
        : text.includes("רעש")
          ? "noise"
          : text.includes("טסט")
            ? "test"
            : text.length > 0
              ? "other"
              : "unknown",
    vehicleType: text.includes("suv") || text.includes("גיפ") || text.includes("ג׳יפ")
      ? "suv"
      : text.includes("מסחרי")
        ? "commercial"
        : "private",
    evVehicle,
    tireCount: text.includes("4") || text.includes("ארבע") || text.includes("כולם") || text.includes("רביע")
      ? 4
      : text.includes("2") || text.includes("שניים") || text.includes("זוג")
        ? 2
        : text.includes("1") || text.includes("אחד") || text.includes("בודד")
          ? 1
          : "unknown",
  };
}

function profileIsReady(profile: RecommendationProfile) {
  return (
    profile.tireCount !== "unknown" &&
    profile.replacementReason !== "unknown" &&
    profile.monthlyMileage !== "unknown" &&
    profile.priority !== "unknown" &&
    profile.drivingStyle !== "unknown"
  );
}

function formatRecommendationContext(recommendations: TireRecommendationSet) {
  return (["budget", "mid", "premium"] as const)
    .map((tier) => {
      const recommendation = recommendations[tier];
      const tire = recommendation.tire;

      if (!tire) {
        return `${tier}: no tire model available in the local knowledge base yet. Explanation: ${recommendation.explanation}`;
      }

      return [
        `${tier}: ${tire.brand} ${tire.model}`,
        `Score: ${recommendation.score}`,
        `Explanation: ${recommendation.explanation}`,
        `Why it matches: ${recommendation.matchReason}`,
        `Tyrei notes: ${tire.notesForTyrei}`,
      ].join("\n");
    })
    .join("\n\n");
}

function formatTireKnowledgeSummary() {
  const tireModels = tireKnowledgeBase
    .map((tire) =>
      [
        `${tire.tier}: ${tire.brand} ${tire.model}`,
        `scores comfort=${tire.comfortScore}, quiet=${tire.quietScore}, wetGrip=${tire.wetGripScore}, longevity=${tire.longevityScore}, value=${tire.valueScore}`,
        `style=${tire.drivingStyle}, evSuitable=${tire.evSuitable ? "yes" : "no"}, confidence=${tire.confidence}`,
        `notes=${tire.notesForTyrei}`,
      ].join(" | "),
    )
    .join("\n");

  return [
    `Brand tiers:`,
    `Budget brands: ${tireBrandTiers.budget.join(", ")}`,
    `Mid brands: ${tireBrandTiers.mid.join(", ")}`,
    `Premium brands: ${tireBrandTiers.premium.join(", ")}`,
    ``,
    `Known tire models:`,
    tireModels,
  ].join("\n");
}

function toOpenAIInput(
  messages: ClientMessage[],
  vehicle: Vehicle,
  profile: RecommendationProfile,
  recommendations: TireRecommendationSet,
) {
  const vehicleContext = [
    `Vehicle model: ${vehicle.model}`,
    `Vehicle year: ${vehicle.year}`,
    `Legal tire size: ${vehicle.tireSize}`,
    `Plate number: ${vehicle.plateNumber}`,
  ].join("\n");
  const recommendationContext = formatRecommendationContext(recommendations);
  const ready = profileIsReady(profile);
  const knowledgeSummary = formatTireKnowledgeSummary();
  const knownProfile = formatKnownProfile(profile);

  return [
    {
      role: "user" as const,
      content: [
        `Context for this conversation:\n${vehicleContext}`,
        `Known customer profile extracted from the conversation:\n${knownProfile}`,
        `Current tire knowledge base summary:\n${knowledgeSummary}`,
        `Structured recommendations from local engine:\n${recommendationContext}`,
        `Profile ready for final recommendations: ${ready ? "yes" : "no"}`,
        ready
          ? "You may recommend now. Use the structured recommendations above and explain why each tier fits."
          : "Do not force a questionnaire. Ask only one missing important question, unless the user asked a general tire question.",
      ].join("\n\n"),
    },
    ...messages.map((message) => ({
      role: message.role === "user" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    })),
  ];
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY חסר. הוסף מפתח לקובץ .env.local והפעל מחדש את השרת." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as {
      messages?: ClientMessage[];
      vehicle?: Vehicle;
    };

    if (!Array.isArray(body.messages) || !body.vehicle) {
      return Response.json({ error: "בקשה לא תקינה." }, { status: 400 });
    }

    const profile = inferProfile(body.messages, body.vehicle);
    const recommendations = recommendTires(profile);
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.create({
      model: "gpt-5.5",
      instructions: systemPrompt,
      input: toOpenAIInput(body.messages, body.vehicle, profile, recommendations),
    });

    return Response.json({
      message: response.output_text || "לא הצלחתי לנסח תשובה כרגע. אפשר לנסות שוב?",
      profile,
      recommendations: profileIsReady(profile) ? recommendations : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tyrei לא הצליח לענות כרגע.";
    return Response.json({ error: message }, { status: 500 });
  }
}
