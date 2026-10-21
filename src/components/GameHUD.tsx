import React, { useState } from 'react';
import { GameHUDState } from '../game/engine.ts';
import { WeaponStats } from '../game/ballistics.ts';
import { soundEngine } from '../game/audio.ts';

interface GameHUDProps {
  state: GameHUDState;
  onFireTouchStart: () => void;
  onFireTouchEnd: () => void;
  onToggleADS: () => void;
  onJump: () => void;
  onCrouch: () => void;
  onReload: () => void;
  onSwitchWeapon: (index: number) => void;
  onPause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isJoystickActive: boolean;
  joystickCurrent: { x: number; y: number };
}

export const GameHUD: React.FC<GameHUDProps> = ({
  state,
  onFireTouchStart,
  onFireTouchEnd,
  onToggleADS,
  onJump,
  onCrouch,
  onReload,
  onSwitchWeapon,
  onPause,
  isMuted,
  onToggleMute,
  isJoystickActive,
  joystickCurrent
}) => {
  const isSniperADS = state.isADS && state.currentWeapon.category === 'sniper';

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden">
      {/* Critical Low Health Red Vignette */}
      {state.health <= 25 && state.health > 0 && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(220,38,38,0.45)_100%)] transition-opacity duration-300" />
      )}

      {/* Sniper High-Magnification Scope Overlay */}
      {isSniperADS && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/90">
          <div className="relative w-[340px] h-[340px] md:w-[500px] md:h-[500px] rounded-full border-4 border-slate-700/80 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)]">
            {/* Scope Crosshairs & Mil-dots */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-red-500/80 -translate-x-1/2" />
            <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-red-500/80 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500/50" />
            <div className="absolute top-1/2 left-1/2 w-48 h-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500/20" />
            {/* Range markers */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-6 text-[10px] text-red-400 font-mono">100m</div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-14 text-[10px] text-red-400 font-mono">200m</div>
          </div>
        </div>
      )}

      {/* Center Dynamic Reticle & Hitmarker (if not sniper ADS) */}
      {!isSniperADS && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {/* Crosshair lines */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Center dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/90 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />

            {/* Dynamic bloom lines */}
            <div className={`absolute top-0 w-0.5 h-2.5 bg-cyan-300 transition-all ${state.isADS ? 'translate-y-1 opacity-40' : 'translate-y-0 opacity-80'}`} />
            <div className={`absolute bottom-0 w-0.5 h-2.5 bg-cyan-300 transition-all ${state.isADS ? '-translate-y-1 opacity-40' : 'translate-y-0 opacity-80'}`} />
            <div className={`absolute left-0 h-0.5 w-2.5 bg-cyan-300 transition-all ${state.isADS ? 'translate-x-1 opacity-40' : 'translate-x-0 opacity-80'}`} />
            <div className={`absolute right-0 h-0.5 w-2.5 bg-cyan-300 transition-all ${state.isADS ? '-translate-x-1 opacity-40' : 'translate-x-0 opacity-80'}`} />

            {/* Hitmarker tick */}
            {state.hitmarker && (
              <div className="absolute inset-0 flex items-center justify-center animate-ping">
                {state.hitmarker === 'headshot' ? (
                  <svg className="w-8 h-8 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2.5" />
                    <line x1="20" y1="4" x2="4" y2="20" strokeWidth="2.5" />
                    <circle cx="12" cy="12" r="5" strokeWidth="2" fill="rgba(239,68,68,0.4)" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" />
                    <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" />
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOP-LEFT PERIMETER CLUSTER: Team Scores & Match Timer */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 bg-[#090e1a]/85 border border-slate-700/60 rounded-lg px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
          {/* Alpha Score (Blue) */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span className="text-xs font-mono font-bold text-cyan-300">ALPHA</span>
            <span className="text-base font-black font-mono tabular-nums text-slate-100">{state.scoreAlpha}</span>
          </div>

          <span className="text-slate-500 font-mono text-xs">VS</span>

          {/* Bravo Score (Red) */}
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black font-mono tabular-nums text-slate-100">{state.scoreBravo}</span>
            <span className="text-xs font-mono font-bold text-red-400">BRAVO</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          </div>

          <div className="h-4 w-[1px] bg-slate-700 mx-1" />

          {/* Match Countdown */}
          <div className="text-xs font-mono font-bold tracking-wider text-amber-400 tabular-nums">
            {Math.floor(state.timeRemaining / 60)}:{(state.timeRemaining % 60).toString().padStart(2, '0')}
          </div>
        </div>

        {/* Tactical Kill / Headshot Tracker */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 px-1">
          <span>KILLS: <strong className="text-slate-100 tabular-nums">{state.kills}</strong></span>
          <span>DEATHS: <strong className="text-slate-100 tabular-nums">{state.deaths}</strong></span>
          <span>HEADSHOTS: <strong className="text-amber-400 tabular-nums">{state.headshots}</strong></span>
        </div>
      </div>

      {/* TOP-RIGHT PERIMETER CLUSTER: Utility Controls (Pause, Mute) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onToggleMute}
          aria-label="Toggle Mute"
          tabIndex={-1}
          className="w-9 h-9 rounded-md bg-[#090e1a]/85 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 shadow"
        >
          {isMuted ? (
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>

        <button
          onClick={onPause}
          aria-label="Pause Game"
          tabIndex={-1}
          className="px-3 h-9 rounded-md bg-[#090e1a]/85 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 shadow"
        >
          <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>ESC</span>
        </button>
      </div>

      {/* BOTTOM-LEFT CLUSTER: Vitality, Armor & Mobile Virtual Joystick Touch Hub */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-[#090e1a]/90 border border-slate-700/60 rounded-xl p-3 w-56 shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
          {/* Health Bar */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono font-bold text-emerald-400 tracking-wider">VITALITY</span>
            <span className="text-sm font-black font-mono tabular-nums text-slate-100">{state.health} HP</span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                state.health > 50 ? 'bg-emerald-500' : state.health > 25 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, state.health))}%` }}
            />
          </div>

          {/* Armor Bar */}
          <div className="flex items-center justify-between mt-2 mb-1">
            <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">ARMOR PLATING</span>
            <span className="text-xs font-bold font-mono tabular-nums text-cyan-200">{state.armor} AP</span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-cyan-400 transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, state.armor * 2))}%` }}
            />
          </div>

          {/* Stance Indicator */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
            <span className={`px-2 py-0.5 rounded ${state.isCrouching ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}>
              {state.isCrouching ? 'CROUCHING [C]' : 'STANDING'}
            </span>
            <span className="text-slate-500">JOYSTICK: MOVE</span>
          </div>
        </div>
      </div>

      {/* BOTTOM-RIGHT CLUSTER: Weapon Arsenal, Ammo & Touch Action Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Mobile Tactical Touch Buttons (Touch Actions) */}
        <div className="flex items-center gap-2 mb-1">
          {/* Crouch button */}
          <button
            onClick={onCrouch}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono font-bold text-[10px] border shadow transition active:scale-95 ${
              state.isCrouching
                ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                : 'bg-slate-900/80 border-slate-700/70 text-slate-300'
            }`}
          >
            <svg className="w-4 h-4 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>CROUCH</span>
          </button>

          {/* Jump button */}
          <button
            onClick={onJump}
            className="w-12 h-12 rounded-xl bg-slate-900/80 active:bg-cyan-900/50 border border-slate-700/70 active:border-cyan-400 text-slate-300 flex flex-col items-center justify-center font-mono font-bold text-[10px] shadow transition active:scale-95"
          >
            <svg className="w-4 h-4 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>JUMP</span>
          </button>

          {/* Reload button */}
          <button
            onClick={onReload}
            disabled={state.isReloading}
            className="w-12 h-12 rounded-xl bg-slate-900/80 active:bg-amber-900/50 border border-slate-700/70 active:border-amber-400 text-slate-300 flex flex-col items-center justify-center font-mono font-bold text-[10px] shadow transition active:scale-95 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 mb-0.5 ${state.isReloading ? 'animate-spin text-amber-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>RELOAD</span>
          </button>

          {/* ADS (Aim Down Sights) button */}
          <button
            onClick={onToggleADS}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-mono font-bold text-xs border shadow transition active:scale-95 ${
              state.isADS
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900/80 border-slate-700/70 text-slate-300'
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="7" strokeWidth="2" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
            <span>ADS</span>
          </button>

          {/* Large FIRE button */}
          <button
            onPointerDown={onFireTouchStart}
            onPointerUp={onFireTouchEnd}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 active:from-red-500 active:to-rose-600 border border-red-400 text-white font-black text-sm tracking-wider uppercase flex flex-col items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)] transition active:scale-95"
          >
            <svg className="w-6 h-6 mb-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
            <span>FIRE</span>
          </button>
        </div>

        {/* Tactical Weapon Card & Ammo Readout */}
        <div className="bg-[#090e1a]/90 border border-slate-700/60 rounded-xl p-3 w-64 shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
              {state.currentWeapon.name}
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              {state.currentWeapon.category}
            </span>
          </div>

          {/* Ammo display */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-4xl font-black font-mono tabular-nums ${
                state.ammo <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-100'
              }`}>
                {state.ammo}
              </span>
              <span className="text-sm font-mono text-slate-400 tabular-nums">
                / {state.reserveAmmo}
              </span>
            </div>
            {state.isReloading && (
              <span className="text-xs font-mono text-amber-400 animate-pulse font-bold">
                RELOADING...
              </span>
            )}
          </div>

          {/* Weapon Switcher Carousel Tabs */}
          <div className="grid grid-cols-4 gap-1 mt-2.5 pt-2 border-t border-slate-800">
            {['Viper AR', 'Apex Snpr', 'Havoc Shot', 'Titan .45'].map((gunName, idx) => {
              const isSelected = state.currentWeapon.name.toLowerCase().includes(gunName.slice(0, 4).toLowerCase());
              return (
                <button
                  key={gunName}
                  onClick={() => onSwitchWeapon(idx)}
                  className={`py-1 px-1 rounded text-[9px] font-mono font-bold uppercase transition ${
                    isSelected
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/60'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {gunName}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
