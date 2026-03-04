"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { API_ENDPOINTS } from "../../../lib/api-config";
import { useIsAdmin } from "../../../lib/useIsAdmin";

interface Medal {
  id: string;
  name: string;
  description: string;
  type: "standard" | "rare";
  material: string;
  icon_class?: string;
  earned: boolean;
  earnedDate?: string;
}

export default function AchievementsPage() {
  const { user } = useUser();
  const { isAdmin } = useIsAdmin();
  const [medals, setMedals] = useState<Medal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedal, setSelectedMedal] = useState<Medal | null>(null);

  // Admin state
  const [grantEmail, setGrantEmail] = useState("");
  const [grantSlug, setGrantSlug] = useState("vibranium-visionary"); // Default
  const [grantStatus, setGrantStatus] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch all definitions
        const allRes = await fetch(API_ENDPOINTS.achievements);
        const allData = await allRes.json();
        const allAchievements = allData.achievements || [];

        // 2. Fetch user earnings
        const userRes = await fetch(API_ENDPOINTS.userAchievements(user.id));
        const userData = await userRes.json();
        const earnedMap = new Map();
        (userData.achievements || []).forEach((ea: any) => {
          earnedMap.set(ea.id, ea.earned_at);
        });

        // 3. Merge
        const merged: Medal[] = allAchievements.map((a: any) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          type: a.type,
          material: a.material,
          icon_class: a.icon_class,
          earned: earnedMap.has(a.id),
          earnedDate: earnedMap.get(a.id),
        }));

        setMedals(merged);
      } catch (err) {
        console.error("Failed to fetch achievements", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !isAdmin) return;
    setGrantStatus("Granting...");
    try {
      const res = await fetch(API_ENDPOINTS.adminGrantAchievement, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerk_user_id: user.id,
          target_email: grantEmail,
          slug: grantSlug,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGrantStatus(`Success: ${data.message}`);
        setGrantEmail("");
      } else {
        setGrantStatus(`Error: ${data.message}`);
      }
    } catch (err) {
      setGrantStatus(`Error: ${err}`);
    }
  };

  const getMedalColor = (material: string) => {
    switch (material) {
      case "iron":
        return "from-gray-700 to-gray-500 border-gray-600";
      case "bronze":
        return "from-amber-700 to-amber-500 border-amber-600";
      case "silver":
        return "from-gray-300 to-gray-100 border-gray-400";
      case "gold":
        return "from-yellow-400 to-yellow-200 border-yellow-500";
      case "platinum":
        return "from-slate-300 to-white border-slate-400";
      case "diamond":
        return "from-cyan-300 to-blue-100 border-cyan-400";
      case "iridium":
        return "from-indigo-300 to-white border-indigo-400";
      case "vibranium":
        return "from-purple-700 to-indigo-900 border-purple-500";
      case "palladium":
        return "from-gray-200 to-white border-gray-300";
      case "plutonium":
        return "from-green-900 to-green-700 border-green-500 animate-pulse-slow";
      case "osmium":
        return "from-sky-800 to-sky-600 border-sky-500";
      default:
        return "from-gray-500 to-gray-300";
    }
  };

  const getGlowColor = (material: string) => {
    switch (material) {
      case "gold":
        return "shadow-yellow-500/50";
      case "diamond":
        return "shadow-cyan-400/60";
      case "vibranium":
        return "shadow-purple-500/60";
      case "plutonium":
        return "shadow-green-500/60";
      default:
        return "shadow-gray-500/30";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
            Achievements & Medals
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Showcase your learning journey. Earn medals for completing courses
            and participating in the community.
          </p>
        </header>

        {/* Standard Medals Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 border-b pb-2 flex items-center gap-2">
            <i className="bi bi-trophy-fill text-yellow-500"></i> Progression
            Medals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {medals
              .filter((m) => m.type === "standard")
              .map((medal) => (
                <MedalCard
                  key={medal.id}
                  medal={medal}
                  getColor={getMedalColor}
                  getGlow={getGlowColor}
                  onClick={() => setSelectedMedal(medal)}
                />
              ))}
          </div>
        </section>

        {/* Rare Medals Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 border-b pb-2 flex items-center gap-2">
            <i className="bi bi-stars text-purple-500"></i> Rare & Legendary
            Medals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {medals
              .filter((m) => m.type === "rare")
              .map((medal) => (
                <MedalCard
                  key={medal.id}
                  medal={medal}
                  getColor={getMedalColor}
                  getGlow={getGlowColor}
                  isRare={true}
                  onClick={() => setSelectedMedal(medal)}
                />
              ))}
          </div>
        </section>

        {/* Admin Section */}
        {isAdmin && (
          <section className="bg-white p-6 rounded-xl shadow-lg border border-purple-100">
            <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
              <i className="bi bi-shield-lock-fill"></i> Admin: Grant Rare Medal
            </h2>
            <form onSubmit={handleGrant} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Target User Email</label>
                <input
                  type="email"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>
              <div className="w-full md:w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">Medal</label>
                <select
                  value={grantSlug}
                  onChange={(e) => setGrantSlug(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  {medals.filter(m => m.type === 'rare').map(m => (
                    <option key={m.id} value={m.name.toLowerCase().replace(/ /g, '-')}>
                      {m.name}
                    </option>
                  ))}
                  {/* Fallback options if slug logic differs, but for now we rely on simple dash concat or hardcoded slugs in backend */}
                </select>
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors"
              >
                Grant Medal
              </button>
            </form>
            {grantStatus && (
              <p className={`mt-3 text-sm font-medium ${grantStatus.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {grantStatus}
              </p>
            )}
          </section>
        )}

        {/* 3D Modal */}
        {selectedMedal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedMedal(null)}>
            <div className="bg-white rounded-2xl p-8 max-w-md w-full relative transform transition-all scale-100 shadow-2xl" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setSelectedMedal(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <i className="bi bi-x-lg text-xl"></i>
              </button>
              
              <div className="flex flex-col items-center">
                {/* Large 3D Rotating Medal */}
                <div className="perspective-1000 mb-6">
                   <div
                    className={`relative w-48 h-48 rounded-full bg-gradient-to-br ${getMedalColor(selectedMedal.material)} shadow-2xl ${getGlowColor(selectedMedal.material)} border-8 flex items-center justify-center animate-[spin_5s_linear_infinite] style={{transformStyle: 'preserve-3d'}}`}
                  >
                    <div className="absolute inset-4 rounded-full border-2 border-white/30"></div>
                    <div className="text-white drop-shadow-lg transform -rotate-y-12"> {/* Counter-rotate icon to keep it mostly visible or let it spin too */}
                       <i className={`bi ${selectedMedal.icon_class || 'bi-award-fill'} text-6xl`}></i>
                    </div>
                     {/* Shine */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-50"></div>
                  </div>
                </div>

                <h2 className="text-3xl font-extrabold text-gray-900 mb-2 text-center">{selectedMedal.name}</h2>
                <div className={`px-4 py-1 rounded-full text-sm font-bold mb-4 ${selectedMedal.earned ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                   {selectedMedal.earned ? `Earned on ${new Date(selectedMedal.earnedDate!).toLocaleDateString()}` : "Locked"}
                </div>
                <p className="text-gray-600 text-center text-lg">{selectedMedal.description}</p>
                
                {selectedMedal.earned && (
                   <div className="mt-6 flex gap-3">
                      <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                         <i className="bi bi-share-fill mr-2"></i> Share
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                        <i className="bi bi-download mr-2"></i> Certificate
                      </button>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function MedalCard({
  medal,
  getColor,
  getGlow,
  isRare,
  onClick,
}: {
  medal: Medal;
  getColor: any;
  getGlow: any;
  isRare?: boolean;
  onClick: () => void;
}) {
  return (
    <div 
      className={`group relative perspective-1000 cursor-pointer`}
      onClick={onClick}
    >
      <div
        className={`relative flex flex-col items-center p-6 rounded-2xl bg-white transition-all duration-300 
        ${medal.earned ? "hover:-translate-y-2 hover:shadow-xl" : "opacity-70 grayscale hover:opacity-100 hover:grayscale-0"}
        ${isRare && medal.earned ? "shadow-lg ring-1 ring-purple-100" : "shadow-md"}
      `}
      >
        {/* 3D Medal Visual */}
        <div
          className={`relative w-24 h-24 mb-4 rounded-full bg-gradient-to-br ${getColor(medal.material)} shadow-xl ${getGlow(medal.material)} border-4 flex items-center justify-center transform transition-transform duration-500 group-hover:rotate-y-12`}
        >
          {/* Inner Detail Ring */}
          <div className="absolute inset-2 rounded-full border border-white/30"></div>

          {/* Center Icon/Symbol */}
          <div className="text-white drop-shadow-md">
            <i className={`bi ${medal.icon_class || 'bi-award-fill'} text-3xl`}></i>
          </div>

          {/* Shine Effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        </div>

        <h3
          className={`font-bold text-gray-900 mb-1 text-center ${isRare ? "text-lg" : "text-base"}`}
        >
          {medal.name}
        </h3>
        <p className="text-xs text-center text-gray-500 mb-3 leading-tight min-h-[2.5em]">
          {medal.description}
        </p>

        {medal.earned ? (
          <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium flex items-center gap-1">
            <i className="bi bi-check-circle-fill"></i> Earned
          </div>
        ) : (
          <div className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center gap-1">
            <i className="bi bi-lock-fill"></i> Locked
          </div>
        )}
      </div>
    </div>
  );
}
