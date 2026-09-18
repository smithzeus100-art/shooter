import React from 'react';
import { Shield, Heart, Zap, Volume2, VolumeX, Pause, Play, Cpu, Bot } from 'lucide-react';
import { GameEngine } from '../game/engine';
import { audioManager } from '../game/audio';

interface HUDProps {
  engine: GameEngine;
  onPauseToggle: () => void;
  isPaused: boolean;
}

export const HUD: React.FC<HUDProps> = ({ engine, onPauseToggle, isPaused }) => {
  const p = engine.player;
  const [isMuted, setIsMuted] = React.useState(audioManager.getIsMuted());
  const [isAiPilot, setIsAiPilot] = React.useState(engine.isAiPilot);

  const toggleMute = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  };

  const toggleAiPilot = () => {
    engine.toggleAiPilot();
    setIsAiPilot(engine.isAiPilot);
  };

  const hpRatio = Math.max(0, p.health / p.maxHealth);
  const shieldRatio = Math.max(0, p.shield / p.maxShield);
  const xpRatio = Math.max(0, p.xp / p.nextLevelXp);
  const dashRatio = p.dashTimer > 0 ? 1 - p.dashTimer / p.dashCooldown : 1;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 select-none font-sans">
      {/* Top Header: Ship Status, AI Status Telemetry & Controls */}
      <div className="flex items-start justify-between">
        {/* Left: Hull & Shield Gauges */}
        <div className="flex flex-col gap-2.5">
          {/* Shield Bar */}
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-sky-400" />
            <div className="relative h-3 w-48 overflow-hidden rounded-full bg-slate-900/90 border border-sky-500/30">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-sky-300 transition-all duration-100"
                style={{ width: `${shieldRatio * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono font-medium text-sky-300">
              {Math.ceil(p.shield)} / {p.maxShield}
            </span>
          </div>

          {/* Hull Bar */}
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            <div className="relative h-3 w-48 overflow-hidden rounded-full bg-slate-900/90 border border-rose-500/30">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-100"
                style={{ width: `${hpRatio * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono font-medium text-rose-300">
              {Math.ceil(p.health)} / {p.maxHealth}
            </span>
          </div>

          {/* Tactical Dash Status */}
          <div className="flex items-center gap-2 mt-1">
            <Zap className={`h-4 w-4 ${dashRatio >= 1 ? 'text-amber-400' : 'text-slate-600'}`} />
            <div className="relative h-2 w-28 overflow-hidden rounded-full bg-slate-900/90 border border-slate-700">
              <div
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${dashRatio * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono tracking-wide text-slate-400 uppercase">
              {dashRatio >= 1 ? 'DASH READY [SPACE/R-CLICK]' : 'CHARGING'}
            </span>
          </div>
        </div>

        {/* Center: AI Telemetry & Wave Status */}
        <div className="flex flex-col items-center gap-2">
          {/* AI Autopilot Live Telemetry Ticker */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md transition-all ${
            engine.isAiPilot
              ? 'bg-cyan-950/90 border-cyan-500/60 text-cyan-300 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-900/90 border-amber-500/40 text-amber-300'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                engine.isAiPilot ? 'bg-cyan-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                engine.isAiPilot ? 'bg-cyan-400' : 'bg-amber-400'
              }`}></span>
            </span>
            <Cpu className="h-3.5 w-3.5" />
            <span className="text-[11px] font-mono tracking-wider font-semibold uppercase">
              {engine.aiStatusText}
            </span>
          </div>

          <div className="rounded-lg bg-slate-900/80 border border-slate-800 px-4 py-1.5 backdrop-blur-sm text-center">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Combat Sector
            </div>
            <div className="text-lg font-bold text-white tracking-tight">
              Wave {engine.wave}
            </div>
            <div className="text-[11px] font-mono text-cyan-400">
              {Math.ceil(engine.waveDuration - engine.waveTimer)}s to next wave
            </div>
          </div>

          {p.combo > 1 && (
            <div className="mt-0.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[11px] font-bold text-amber-300">
              {p.combo}x COMBO
            </div>
          )}
        </div>

        {/* Right: Score, Level & Utility Controls */}
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Score
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {Math.floor(p.score).toLocaleString()}
            </div>
            {engine.highScore > 0 && (
              <div className="text-[10px] font-mono text-slate-500">
                BEST: {engine.highScore.toLocaleString()}
              </div>
            )}
          </div>

          {/* Interactive Utility Controls */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={toggleAiPilot}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition-all ${
                engine.isAiPilot
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400 text-white shadow-md shadow-cyan-500/30 animate-pulse'
                  : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
              title="Toggle AI Tactical Pilot [HotKey: A]"
            >
              <Bot className="h-4 w-4" />
              <span>{engine.isAiPilot ? 'AI PILOT: ON' : 'AI PILOT: OFF'}</span>
            </button>

            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              onClick={onPauseToggle}
              className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Pause Game"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: XP Progress & Escort Wing Inventory */}
      <div className="flex flex-col gap-2">
        {/* Active Escort Drones Badge List */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Escort Wing ({p.drones.length}):
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {p.drones.map((drone, idx) => (
              <span
                key={drone.id || idx}
                className="px-2 py-0.5 rounded text-[10px] font-medium border"
                style={{
                  backgroundColor: `${drone.color}15`,
                  borderColor: `${drone.color}40`,
                  color: drone.color,
                }}
              >
                {drone.type}
              </span>
            ))}
          </div>
        </div>

        {/* Global XP Level Bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-cyan-950 border border-cyan-500/50 text-xs font-bold text-cyan-300 font-mono">
            {p.level}
          </div>
          <div className="relative flex-1 h-2.5 overflow-hidden rounded-full bg-slate-900/90 border border-cyan-500/30">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-100"
              style={{ width: `${xpRatio * 100}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-cyan-400">
            {Math.floor(p.xp)} / {p.nextLevelXp} XP
          </span>
        </div>
      </div>
    </div>
  );
};
