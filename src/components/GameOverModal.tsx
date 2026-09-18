import React from 'react';
import { RotateCcw, Trophy, Target, Shield, Zap } from 'lucide-react';
import { GameEngine } from '../game/engine';

interface GameOverModalProps {
  engine: GameEngine;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ engine, onRestart }) => {
  const p = engine.player;
  const isNewHighScore = p.score >= engine.highScore && p.score > 0;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 select-none font-sans">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl text-center">
        {/* Status Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-4">
          <Shield className="h-7 w-7" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
          Hull Destroyed
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Your flagship fell in Sector Wave {engine.wave}.
        </p>

        {/* Score Breakdown Card */}
        <div className="w-full rounded-xl bg-slate-950/60 border border-slate-800 p-4 mb-6">
          <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Final Score
            </span>
            <span className="text-xl font-bold font-mono text-cyan-300">
              {Math.floor(p.score).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Highest Score
            </span>
            <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-slate-300">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>{Math.floor(engine.highScore).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Fleet Level
            </span>
            <span className="font-mono text-sm font-semibold text-white">
              Level {p.level}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Escort Drones Built
            </span>
            <span className="font-mono text-sm font-semibold text-white">
              {p.drones.length} Modules
            </span>
          </div>
        </div>

        {isNewHighScore && (
          <div className="mb-6 w-full rounded-lg bg-amber-500/10 border border-amber-500/30 py-2 text-xs font-bold uppercase tracking-wider text-amber-300">
            New Personal High Score!
          </div>
        )}

        {/* Restart Button */}
        <button
          onClick={onRestart}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3.5 text-sm font-bold tracking-wide text-slate-950 transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/25 active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          <span>RELAUNCH FLEET</span>
        </button>
      </div>
    </div>
  );
};
