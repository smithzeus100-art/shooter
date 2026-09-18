import React, { useEffect, useState } from 'react';
import { UpgradeOption } from '../types';
import { Crosshair, Maximize2, Target, Zap, Activity, Flame, FastForward, Shield, Wind, Radio, Heart, Sparkles, Cpu, Bot } from 'lucide-react';

interface LevelUpModalProps {
  options: UpgradeOption[];
  onSelect: (option: UpgradeOption) => void;
  isAiPilot?: boolean;
  bestOption?: UpgradeOption | null;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Crosshair,
  Maximize2,
  Target,
  Zap,
  Activity,
  Flame,
  FastForward,
  Shield,
  Wind,
  Radio,
  Heart,
  Sparkles,
};

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  options,
  onSelect,
  isAiPilot = true,
  bestOption = null,
}) => {
  const targetChoice = bestOption || options[0];
  const [timeLeft, setTimeLeft] = useState(1.4);

  useEffect(() => {
    if (!isAiPilot || !targetChoice) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          onSelect(targetChoice);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAiPilot, targetChoice, onSelect]);

  const progressPct = Math.max(0, Math.min(100, (1 - timeLeft / 1.4) * 100));

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 select-none font-sans">
      <div className="flex w-full max-w-2xl flex-col items-center">
        {/* Title Header & AI Pilot Auto-Choice Banner */}
        <div className="mb-6 text-center flex flex-col items-center w-full">
          {isAiPilot ? (
            <div className="w-full max-w-md bg-cyan-950/90 border border-cyan-500/50 rounded-xl p-3 mb-3 text-center shadow-lg shadow-cyan-500/10 flex flex-col items-center">
              <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs font-semibold tracking-wide uppercase mb-1.5">
                <Bot className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span>AI PILOT AUTO-SELECTING IN {timeLeft.toFixed(1)}s</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/30">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-sky-300 transition-all duration-100"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Click any option below to override AI selection manually
              </span>
            </div>
          ) : (
            <div className="inline-block rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-2">
              Tactical Upgrade Available
            </div>
          )}

          <h2 className="text-2xl font-bold tracking-tight text-white">
            Enhance Fleet Capabilities
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Choose an escort drone module or core combat enhancement.
          </p>
        </div>

        {/* 3 Upgrade Option Cards */}
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {options.map((opt) => {
            const IconComponent = ICON_MAP[opt.icon] || Sparkles;
            const isBestChoice = targetChoice && targetChoice.id === opt.id && isAiPilot;

            const rarityBorder = isBestChoice
              ? 'border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20'
              : opt.rarity === 'EPIC'
              ? 'border-purple-500/50 hover:border-purple-400 hover:shadow-purple-500/20'
              : opt.rarity === 'RARE'
              ? 'border-sky-500/50 hover:border-sky-400 hover:shadow-sky-500/20'
              : 'border-slate-700 hover:border-cyan-500/50 hover:shadow-cyan-500/20';

            const badgeBg =
              opt.rarity === 'EPIC'
                ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                : opt.rarity === 'RARE'
                ? 'bg-sky-950/80 text-sky-300 border-sky-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-700';

            return (
              <button
                key={opt.id}
                onClick={() => onSelect(opt)}
                className={`group relative flex flex-col justify-between rounded-xl bg-slate-900/90 p-5 text-left border transition-all duration-150 hover:-translate-y-1 hover:shadow-lg ${rarityBorder}`}
              >
                {isBestChoice && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Cpu className="h-3 w-3" /> AI RECOMMENDED
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4 mt-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 group-hover:text-cyan-300 group-hover:border-cyan-500/50 transition-colors">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeBg}`}>
                      {opt.rarity}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors mb-1.5">
                    {opt.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-400">
                    {opt.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
                  <span>INSTALL MODULE</span>
                  <span>&rarr;</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
