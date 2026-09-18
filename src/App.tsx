import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { GameRenderer } from './game/renderer';
import { HUD } from './components/HUD';
import { LevelUpModal } from './components/LevelUpModal';
import { GameOverModal } from './components/GameOverModal';
import { MainMenu } from './components/MainMenu';
import { GameState, UpgradeOption } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './game/constants';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [, setFrameCount] = useState(0);

  // Initialize game systems
  useEffect(() => {
    const engine = new GameEngine();
    const renderer = new GameRenderer();

    engine.onStateChange = (state) => {
      setGameState(state);
    };

    engine.onLevelUp = (options) => {
      setUpgradeOptions(options);
    };

    engineRef.current = engine;
    rendererRef.current = renderer;

    // Window event listeners for controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (engine.state === 'PLAYING') {
        if (e.code === 'Space') {
          e.preventDefault();
          engine.triggerDash();
        }
        if (e.code === 'KeyA') {
          e.preventDefault();
          engine.toggleAiPilot();
        }
        if (e.code === 'KeyP' || e.code === 'Escape') {
          e.preventDefault();
          engine.pauseGame();
        }
      }
      engine.keys[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engine.keys[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      engine.mouseX = e.clientX - rect.left;
      engine.mouseY = e.clientY - rect.top;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        engine.isMouseDown = true;
      } else if (e.button === 2) {
        e.preventDefault();
        engine.triggerDash();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        engine.isMouseDown = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    // Main 60FPS animation loop
    let lastTime = performance.now();
    let animId: number;

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      engine.update(dt);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderer.render(ctx, engine, canvas.width, canvas.height);
        }
      }

      // Sync React state for HUD updates
      setFrameCount((prev) => (prev + 1) % 60);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Handle dynamic canvas resizing to window container
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      if (engineRef.current) {
        engineRef.current.resize(w, h);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startGame();
    }
  }, []);

  const handlePauseToggle = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pauseGame();
    }
  }, []);

  const handleUpgradeSelect = useCallback((option: UpgradeOption) => {
    if (engineRef.current) {
      engineRef.current.applyUpgrade(option);
    }
  }, []);

  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startGame();
    }
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* 60FPS High-DPI Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full cursor-crosshair" />

      {/* Main Menu Screen */}
      {gameState === 'MENU' && engineRef.current && (
        <MainMenu onStart={handleStart} highScore={engineRef.current.highScore} />
      )}

      {/* In-Game Active HUD */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'LEVEL_UP') &&
        engineRef.current && (
          <HUD
            engine={engineRef.current}
            onPauseToggle={handlePauseToggle}
            isPaused={gameState === 'PAUSED'}
          />
        )}

      {/* Roguelite Level Up Modal */}
      {gameState === 'LEVEL_UP' && (
        <LevelUpModal
          options={upgradeOptions}
          onSelect={handleUpgradeSelect}
          isAiPilot={engineRef.current?.isAiPilot}
          bestOption={engineRef.current?.selectBestUpgrade()}
        />
      )}

      {/* Game Over Screen */}
      {gameState === 'GAME_OVER' && engineRef.current && (
        <GameOverModal engine={engineRef.current} onRestart={handleRestart} />
      )}

      {/* Pause Screen Overlay */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm select-none">
          <div className="flex flex-col items-center rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              Mission Paused
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Press P or click below to resume flight operations.
            </p>
            <button
              onClick={handlePauseToggle}
              className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold tracking-wide text-slate-950 transition-colors hover:bg-cyan-400"
            >
              RESUME FLIGHT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
