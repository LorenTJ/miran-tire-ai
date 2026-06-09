"use client";

import { useState } from "react";

export default function Home() {
  const [carFound, setCarFound] = useState(false);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md p-6">
        <h1 className="text-4xl font-bold text-center mb-8">
          צמיגי מירן AI
        </h1>

        <div className="bg-zinc-900 p-6 rounded-2xl shadow-xl">
          <label className="block mb-3 text-lg">
            הכנס מספר רכב
          </label>

          <input
            type="text"
            placeholder="123-45-678"
            className="w-full p-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-xl"
          />

          <button
            onClick={() => setCarFound(true)}
            className="w-full mt-4 bg-yellow-400 text-black font-bold py-4 rounded-xl text-xl hover:bg-yellow-300 transition"
          >
            חפש רכב
          </button>
        </div>

        {carFound && (
          <div className="mt-6 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <h2 className="text-2xl font-bold mb-2">
              Tesla Model 3 2022
            </h2>

            <p className="text-zinc-300 mb-4">
              מידה מקורית: 235/45R18
            </p>

            <div className="space-y-3">
              <div className="bg-zinc-800 p-4 rounded-xl">
                🥇 Kumho PS71 — ₪590
              </div>

              <div className="bg-zinc-800 p-4 rounded-xl">
                🥈 Dunlop Sport Maxx 060+ — ₪690
              </div>

              <div className="bg-zinc-800 p-4 rounded-xl">
                🥉 Michelin Pilot Sport EV — ₪990
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}