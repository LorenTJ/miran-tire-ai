"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Vehicle = {
  plateNumber: string;
  model: string;
  year: number;
  tireSize: string;
};

type ChatMessage = {
  id: number;
  role: "tyrei" | "user";
  content: string;
};

type TireRecommendation = {
  category: "budget" | "mid" | "premium";
  tier: "budget" | "mid" | "premium";
  tire: {
    brand: string;
    model: string;
  } | null;
  tireModel: string;
  price: string;
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

type TireRecommendationSet = {
  budget: TireRecommendation;
  mid: TireRecommendation;
  premium: TireRecommendation;
};

const tierLabels: Record<keyof TireRecommendationSet, string> = {
  budget: "חסכוני",
  mid: "משתלם",
  premium: "פרימיום",
};

let messageId = 0;

function nextMessageId() {
  messageId += 1;
  return messageId;
}

export default function Home() {
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [recommendations, setRecommendations] = useState<TireRecommendationSet | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function handleVehicleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPlateNumber = plateNumber.trim();

    if (!trimmedPlateNumber) return;

    setIsLookingUp(true);
    setError("");
    setVehicle(null);
    setMessages([]);
    setRecommendations(null);
    setChatInput("");

    try {
      const response = await fetch(`/api/vehicle/${encodeURIComponent(trimmedPlateNumber)}`);

      if (!response.ok) {
        setError("רכב לא נמצא");
        return;
      }

      const data = (await response.json()) as Vehicle;
      setVehicle(data);
      setMessages([
        {
          id: nextMessageId(),
          role: "tyrei",
          content: `מצאתי את הרכב שלך: ${data.model} ${data.year}. מידת הצמיג המתאימה היא ${data.tireSize}. עכשיו אשאל כמה שאלות כדי להתאים לך צמיגים.`,
        },
        {
          id: nextMessageId(),
          role: "tyrei",
          content: "כמה צמיגים אתה צריך להחליף?",
        },
      ]);
    } catch {
      setError("רכב לא נמצא");
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = chatInput.trim();
    if (!text || !vehicle || isTyping) return;

    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: "user",
      content: text,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setChatInput("");
    setIsTyping(true);
    setError("");

    try {
      const response = await fetch("/api/tyrei-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          vehicle,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
        recommendations?: TireRecommendationSet | null;
      };

      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: "tyrei",
          content: response.ok
            ? data.message || "לא הצלחתי לנסח תשובה כרגע. אפשר לנסות שוב?"
            : data.error || "Tyrei לא הצליח לענות כרגע.",
        },
      ]);
      setRecommendations(response.ok ? data.recommendations ?? null : null);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: "tyrei",
          content: "Tyrei לא הצליח להתחבר כרגע. נסה שוב בעוד רגע.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#101113] px-4 py-6 text-[#f5f2ea] sm:px-6 lg:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between gap-5">
          <div>
            <p className="text-xs font-medium tracking-[0.42em] text-[#d6c27d]">TYREI</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-5xl">יועץ הצמיגים שלך</h1>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-400 sm:block">
            AI tire advisor
          </div>
        </header>

        <div className="grid flex-1 gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-[2rem] border border-white/10 bg-[#17181b] p-5 shadow-2xl shadow-black/20">
            <form onSubmit={handleVehicleLookup} className="space-y-4">
              <label className="text-sm text-zinc-400">מספר רכב</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(event) => {
                  setPlateNumber(event.target.value);
                  setError("");
                }}
                placeholder="854-49-802"
                className="w-full rounded-2xl border border-white/10 bg-[#101113] px-5 py-4 text-xl text-white outline-none transition placeholder:text-zinc-600 focus:border-[#d6c27d]/60"
              />
              <button
                type="submit"
                disabled={isLookingUp}
                className="w-full rounded-2xl border border-[#d6c27d]/25 bg-[#d6c27d]/10 px-5 py-4 text-sm font-semibold text-[#ead891] transition hover:bg-[#d6c27d]/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLookingUp ? "בודק..." : "מצא את הרכב"}
              </button>
            </form>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            {vehicle && (
              <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-zinc-500">הרכב שזוהה</p>
                <h2 className="text-xl font-semibold text-white">{vehicle.model}</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-[#101113] p-3">
                    <p className="text-zinc-500">שנה</p>
                    <strong>{vehicle.year}</strong>
                  </div>
                  <div className="rounded-xl bg-[#101113] p-3">
                    <p className="text-zinc-500">מידה</p>
                    <strong>{vehicle.tireSize}</strong>
                  </div>
                </div>
              </div>
            )}
          </aside>

          <section className="flex min-h-[560px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#17181b] shadow-2xl shadow-black/20">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-sm text-zinc-500">שיחה עם Tyrei</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
              {!vehicle && !error && (
                <div className="flex h-full min-h-[360px] items-center justify-center text-center">
                  <div className="max-w-md space-y-3">
                    <p className="text-sm text-[#d6c27d]">מתחילים בזיהוי הרכב</p>
                    <h2 className="text-3xl font-semibold text-white">הכנס מספר רכב, ואני אמשיך משם.</h2>
                    <p className="leading-7 text-zinc-400">
                      אחרי הזיהוי השיחה תיפתח כאן, ו-Tyrei ישאל שאלות טבעיות כדי להתאים המלצה.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[86%] whitespace-pre-line rounded-[1.5rem] px-5 py-4 leading-7 ${
                      message.role === "user"
                        ? "rounded-tl-md border border-[#d6c27d]/20 bg-[#d6c27d]/10 text-[#f0dc9a]"
                        : "rounded-tr-md border border-white/10 bg-[#101113] text-zinc-100"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="rounded-[1.5rem] rounded-tr-md border border-white/10 bg-[#101113] px-5 py-4 text-sm text-zinc-400">
                    Tyrei מקליד...
                  </div>
                </div>
              )}

              {recommendations && (
                <div className="grid gap-3 pt-2">
                  {(Object.keys(tierLabels) as Array<keyof TireRecommendationSet>).map((tier) => {
                    const recommendation = recommendations[tier];
                    const tire = recommendation.tire;

                    return (
                      <article
                        key={tier}
                        className="rounded-[1.5rem] border border-white/10 bg-[#101113] p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-[#d6c27d]">{tierLabels[tier]}</p>
                            <h3 className="mt-1 text-xl font-semibold text-white">
                              {tire ? `${tire.brand} ${tire.model}` : recommendation.tireModel}
                            </h3>
                          </div>
                          <strong className="text-sm text-zinc-300">{recommendation.price}</strong>
                        </div>
                        <p className="mt-4 leading-7 text-zinc-300">{recommendation.mainReason}</p>
                        <p className="mt-2 leading-7 text-zinc-500">{recommendation.tradeoffs}</p>
                        <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-400">
                          <p>
                            <span className="text-zinc-300">למה לא זול יותר: </span>
                            {recommendation.whyNotCheaper}
                          </p>
                          <p>
                            <span className="text-zinc-300">למה לא יקר יותר: </span>
                            {recommendation.whyNotMoreExpensive}
                          </p>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-zinc-500">מתאים במיוחד</p>
                            <p className="mt-1 text-zinc-300">{recommendation.bestFor.join(", ")}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">פחות מתאים</p>
                            <p className="mt-1 text-zinc-300">{recommendation.notIdealFor.join(", ")}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-zinc-600">רמת ביטחון: {recommendation.confidence}</p>
                        <button
                          type="button"
                          className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-[#d6c27d]/40 hover:bg-[#d6c27d]/10"
                        >
                          בחרתי בזה
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="border-t border-white/10 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  disabled={!vehicle || isTyping}
                  placeholder={vehicle ? "כתוב תשובה חופשית..." : "השיחה תיפתח אחרי זיהוי הרכב"}
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#101113] px-5 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#d6c27d]/60 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!vehicle || isTyping || !chatInput.trim()}
                  className="rounded-2xl border border-[#d6c27d]/25 bg-[#d6c27d]/10 px-6 py-4 text-sm font-semibold text-[#ead891] transition hover:bg-[#d6c27d]/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  שלח
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
