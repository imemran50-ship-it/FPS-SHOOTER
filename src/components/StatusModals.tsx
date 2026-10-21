import React from 'react';
import { GameHUDState } from '../game/engine.ts';
import { calculateAccuracy } from '../game/rules.ts';

interface StatusModalProps {
  status: 'paused' | 'victory' | 'defeat';
  hudState: GameHUDState;
  shotsFired: number;
  shotsHit: number;
  damageDealt: number;
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const StatusModals: React.FC<StatusModalProps> = ({
  status,
  hudState,
  shotsFired,
  shotsHit,
  damageDealt,
  onResume,
  onRestart,
  onExitToTitle
}) => {
  const accuracy = calculateAccuracy(shotsFired, shotsHit);

  if (status === 'paused') {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
        <div className="w-full max-w-sm rounded-2xl bg-[#090f1e] border border-slate-700/80 p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-center">
          <div className="text-2xl font-black font-mono tracking-widest text-slate-100 uppercase mb-1">
            COMBAT SUSPENDED
          </div>
          <p className="text-xs font-mono text-slate-400 mb-6">MATCH PAUSED</p>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={onResume}
              className="w-full py-3 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black tracking-wider uppercase text-sm shadow transition"
            >
              RESUME COMBAT [ESC]
            </button>
            <button
              onClick={onRestart}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold tracking-wider uppercase text-xs transition"
            >
              RESTART MATCH
            </button>
            <button
              onClick={onExitToTitle}
              className="w-full py-2.5 px-4 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 font-bold tracking-wider uppercase text-xs transition"
            >
              ABORT TO MAIN MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isVictory = status === 'victory';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 pointer-events-auto">
      <div className="w-full max-w-md rounded-2xl bg-[#090f1e] border border-slate-700/80 p-6 shadow-[0_0_60px_rgba(0,0,0,0.95)] text-center">
        {/* Outcome Header */}
        <div className="mb-2">
          {isVictory ? (
            <div className="inline-block p-2 rounded-full bg-cyan-500/20 border border-cyan-400 mb-2">
              <svg className="w-8 h-8 text-cyan-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="inline-block p-2 rounded-full bg-red-500/20 border border-red-400 mb-2">
              <svg className="w-8 h-8 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        <h2 className={`text-3xl font-black font-mono tracking-widest uppercase ${
          isVictory ? 'text-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]' : 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]'
        }`}>
          {isVictory ? 'VICTORY SECURED' : 'OPERATION FAILED'}
        </h2>
        <p className="text-xs font-mono text-slate-400 tracking-wider mb-6">
          {isVictory ? 'ALPHA SQUAD DOMINANCE ACHIEVED' : 'HOSTILE FORCES OVERWHELMED POSITION'}
        </p>

        {/* Combat Mastery Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">CONFIRMED KILLS</span>
            <div className="text-2xl font-black font-mono text-slate-100 tabular-nums">
              {hudState.kills}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">PRECISION HEADSHOTS</span>
            <div className="text-2xl font-black font-mono text-amber-400 tabular-nums">
              {hudState.headshots}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">WEAPON ACCURACY</span>
            <div className="text-2xl font-black font-mono text-cyan-300 tabular-nums">
              {accuracy}%
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">TOTAL DAMAGE</span>
            <div className="text-2xl font-black font-mono text-rose-400 tabular-nums">
              {damageDealt}
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-2.5">
          <button
            data-start="true"
            onClick={onRestart}
            className={`w-full py-3.5 px-4 rounded-lg font-black tracking-wider uppercase text-sm shadow transition ${
              isVictory
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950'
                : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white'
            }`}
          >
            {isVictory ? 'NEXT DEPLOYMENT (PLAY AGAIN)' : 'RE-DEPLOY SOLDIER (TRY AGAIN)'}
          </button>
          <button
            onClick={onExitToTitle}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold tracking-wider uppercase text-xs transition"
          >
            RETURN TO COMMAND CENTER
          </button>
        </div>
      </div>
    </div>
  );
};
