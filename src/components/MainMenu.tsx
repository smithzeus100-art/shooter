import React from 'react';
import { Play, Shield, Crosshair, Zap, Target, Maximize2, Activity, Sparkles } from 'lucide-react';
import { DRONE_BLUEPRINTS } from '../game/constants';
import { DroneType } from '../types';

interface MainMenuProps {
  onStart: () => void;
  highScore: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart, highScore }) => {
  const droneKeys = Object.keys(DRONE_BLUEPRINTS) as DroneType[];

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-between p-8 bg-slate-950/70 backdrop-blur-sm select-none font-sans overflow-y-auto">
      {/* Top Banner */}
      <div className="flex w-full max-w-4xl items-center justify-between">
        <div className="flex items-center gap-2 text-cyan-400">
          <Shield className="h-5 w-5" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase">
            Aegis Strike Command
          </span>
        </div>
        {highScore > 0 && (
          <div className="rounded-full bg-slate-900/80 border border-slate-800 px-3.5 py-1 text-xs font-mono text-slate-300">
            RECORD: <span className="font-bold text-amber-300">{highScore.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Center Hero Card */}
      <div className="flex flex-col items-center text-center my-auto max-w-2xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Tactical Space Arcade</span>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl mb-4">
          AEGIS <span className="text-cyan-400">FLEET</span>
        </h1>

        <p className="text-base leading-relaxed text-slate-300 max-w-lg mb-8">
          Pilot your flagship, defeat hostile swarms, and build a trailing battle-wing of escort drones with specialized weaponry.
        </p>

        {/* Start Game Action */}
        <button
          onClick={onStart}
          className="group flex items-center justify-center gap-3 rounded-xl bg-cyan-500 px-8 py-4 text-base font-bold tracking-wide text-slate-950 transition-all duration-150 hover:bg-cyan-400 hover:shadow-xl hover:shadow-cyan-500/25 active:scale-95"
        >
          <Play className="h-5 w-5 fill-current" />
          <span>LAUNCH FLEET</span>
        </button>

        {/* Quick Controls Cheat Sheet */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 border border-slate-800 px-3 py-1.5">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200">WASD</kbd>
            <span>Move</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 border border-slate-800 px-3 py-1.5">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200">MOUSE</kbd>
            <span>Aim</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 border border-slate-800 px-3 py-1.5">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200">SPACE / R-CLICK</kbd>
            <span>Tactical Dash</span>
          </div>
        </div>
      </div>

      {/* Escort Drone Roster Preview */}
      <div className="w-full max-w-4xl border-t border-slate-800/80 pt-6">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-3 text-center">
          Available Modular Escort Drones
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {droneKeys.map((k) => {
            const bp = DRONE_BLUEPRINTS[k];
            return (
              <div
                key={k}
                className="flex flex-col items-center rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-center"
              >
                <div
                  className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold"
                  style={{
                    backgroundColor: `${bp.color}15`,
                    borderColor: `${bp.color}40`,
                    color: bp.color,
                  }}
                >
                  {k[0]}
                </div>
                <div className="text-xs font-bold text-white mb-0.5">{bp.name}</div>
                <div className="text-[10px] text-slate-400 line-clamp-2">{bp.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
