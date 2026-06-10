import OpenAI from "openai";
import { tireKnowledgeBase, tireBrandTiers } from "@/data/tire-knowledge";
import {
  extractConversationProfile,
  type ConversationProfile,
} from "@/lib/conversation-state";
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
- Use structuredProfile as the source of truth for what is already known.
- Infer useful information from free text, but do not override structuredProfile.
- Do not ask again for fields that are already known in structuredProfile.
- Ask only about fields listed in structuredProfile.missingFields, one question at a time.
- If the user asks a general tire question, answer it directly and briefly, then continue the fitting flow.
- Keep answers short, practical, and easy to understand.
- Recommendations must explain why they match the customer profile.
- Explain recommendations like a tire expert: compare options clearly, mention tradeoffs, and keep it practical.
- Explain why a cheaper tire may be enough when the profile is price-sensitive or low-mileage.
- Explain when premium is not worth it.
- Explain when premium is justified.
- Mention EV/Tesla factors when relevant: quietness, weight, wear, comfort, and EV suitability.
- Do not exaggerate and do not claim facts not present in the knowledge base or recommendation context.
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

function toRecommendationProfile(
  structuredProfile: ConversationProfile,
  vehicle: Vehicle,
): RecommendationProfile {
  const model = vehicle.model.toLowerCase();
  const evVehicle = model.includes("tesla") || model.includes("טסלה") || model.includes("electric");
  return {
    drivingStyle: structuredProfile.drivingStyle ?? "unknown",
    priority: structuredProfile.priority === "balance" ? "balanced" : (structuredProfile.priority ?? "unknown"),
    monthlyMileage: structuredProfile.monthlyMileage ?? "unknown",
    replacementReason: structuredProfile.replacementReason ?? "unknown",
    vehicleType: "private",
    evVehicle,
    tireCount:
      structuredProfile.tireCount === 1 ||
      structuredProfile.tireCount === 2 ||
      structuredProfile.tireCount === 4
        ? structuredProfile.tireCount
        : "unknown",
  };
}

function profileIsReady(profile: ConversationProfile) {
  return profile.missingFields.length === 0;
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
        `${tier}: ${recommendation.tireModel}`,
        `Category: ${recommendation.category}`,
        `Price: ${recommendation.price}`,
        `Score: ${recommendation.score}`,
        `Main reason: ${recommendation.mainReason}`,
        `Tradeoffs: ${recommendation.tradeoffs}`,
        `Why not cheaper: ${recommendation.whyNotCheaper}`,
        `Why not more expensive: ${recommendation.whyNotMoreExpensive}`,
        `Confidence: ${recommendation.confidence}`,
        `Best for: ${recommendation.bestFor.join(", ")}`,
        `Not ideal for: ${recommendation.notIdealFor.join(", ")}`,
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
  structuredProfile: ConversationProfile,
  recommendationProfile: RecommendationProfile,
  recommendations: TireRecommendationSet,
) {
  const vehicleContext = [
    `Vehicle model: ${vehicle.model}`,
    `Vehicle year: ${vehicle.year}`,
    `Legal tire size: ${vehicle.tireSize}`,
    `Plate number: ${vehicle.plateNumber}`,
  ].join("\n");
  const recommendationContext = formatRecommendationContext(recommendations);
  const ready = profileIsReady(structuredProfile);
  const knowledgeSummary = formatTireKnowledgeSummary();

  return [
    {
      role: "user" as const,
      content: [
        `Context for this conversation:\n${vehicleContext}`,
        `structuredProfile extracted deterministically from the conversation:\n${JSON.stringify(structuredProfile, null, 2)}`,
        `Recommendation engine profile:\n${JSON.stringify(recommendationProfile, null, 2)}`,
        `Current tire knowledge base summary:\n${knowledgeSummary}`,
        `Structured recommendations from local engine:\n${recommendationContext}`,
        `Profile ready for final recommendations: ${ready ? "yes" : "no"}`,
        ready
          ? "You may recommend now. Use the structured recommendations above and explain why each tier fits."
          : "Do not force a questionnaire. Ask only one question from structuredProfile.missingFields, unless the user asked a general tire question.",
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

    const structuredProfile = extractConversationProfile(body.messages);
    const recommendationProfile = toRecommendationProfile(structuredProfile, body.vehicle);
    const recommendations = recommendTires(recommendationProfile);
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.create({
      model: "gpt-5.5",
      instructions: systemPrompt,
      input: toOpenAIInput(
        body.messages,
        body.vehicle,
        structuredProfile,
        recommendationProfile,
        recommendations,
      ),
    });

    return Response.json({
      message: response.output_text || "לא הצלחתי לנסח תשובה כרגע. אפשר לנסות שוב?",
      structuredProfile,
      profile: recommendationProfile,
      recommendations: profileIsReady(structuredProfile) ? recommendations : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tyrei לא הצליח לענות כרגע.";
    return Response.json({ error: message }, { status: 500 });
  }
}
