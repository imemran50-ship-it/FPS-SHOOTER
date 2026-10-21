import React from 'react';
import { UserProfile } from '../services/userService.ts';
import { MAPS } from '../game/maps.ts';
import { soundEngine } from '../game/audio.ts';

interface TitleScreenProps {
  userProfile: UserProfile | null;
  selectedMap: string;
  onSelectMap: (mapId: string) => void;
  onStartGame: (mode: 'solo' | 'matchmaking') => void;
  onGoogleSignIn: () => void;
  onGuestPlay: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  userProfile,
  selectedMap,
  onSelectMap,
  onStartGame,
  onGoogleSignIn,
  onGuestPlay,
  isMuted,
  onToggleMute
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-4 md:p-8 bg-gradient-to-t from-[#050811]/95 via-[#080d1a]/70 to-[#070b14]/85 select-none pointer-events-auto">
      {/* Top Bar: Soldier ID & Audio Controls */}
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            {userProfile?.callsign ? userProfile.callsign.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wider text-slate-100 uppercase">
                {userProfile?.callsign || 'GUEST SOLDIER'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                LVL {userProfile?.level || 1} · {userProfile?.rank || 'Recruit'}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              K/D: {userProfile ? (userProfile.deaths > 0 ? (userProfile.kills / userProfile.deaths).toFixed(2) : userProfile.kills) : '0.00'} · WINS: {userProfile?.wins || 0}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!userProfile ? (
            <button
              onClick={onGoogleSignIn}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition shadow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Sync Soldier Profile</span>
            </button>
          ) : (
            <span className="text-xs text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded">
              CLOUD SYNCED
            </span>
          )}

          <button
            onClick={onToggleMute}
            aria-label="Toggle audio mute"
            className="w-9 h-9 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center text-slate-300"
          >
            {isMuted ? (
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Centerpiece Title Lockup with Bespoke Inline SVG */}
      <div className="flex flex-col items-center justify-center text-center my-auto max-w-4xl mx-auto">
        {/* Bespoke Tactical Crest Lockup */}
        <div className="mb-3">
          <svg className="w-24 h-24 md:w-32 md:h-32 mx-auto drop-shadow-[0_0_25px_rgba(6,182,212,0.5)]" viewBox="0 0 100 100" fill="none">
            <polygon points="50,5 92,26 92,74 50,95 8,74 8,26" stroke="#00f0ff" strokeWidth="2.5" fill="#0c1626" fillOpacity="0.85"/>
            <polygon points="50,15 82,31 82,69 50,85 18,69 18,31" stroke="#ff3838" strokeWidth="1.5" strokeDasharray="3 3"/>
            {/* Crosshairs & Target Ring */}
            <circle cx="50" cy="50" r="22" stroke="#00f0ff" strokeWidth="2"/>
            <circle cx="50" cy="50" r="12" stroke="#ffaa00" strokeWidth="1.5"/>
            <circle cx="50" cy="50" r="3" fill="#ff3838"/>
            <line x1="50" y1="20" x2="50" y2="35" stroke="#00f0ff" strokeWidth="2"/>
            <line x1="50" y1="65" x2="50" y2="80" stroke="#00f0ff" strokeWidth="2"/>
            <line x1="20" y1="50" x2="35" y2="50" stroke="#00f0ff" strokeWidth="2"/>
            <line x1="65" y1="50" x2="80" y2="50" stroke="#00f0ff" strokeWidth="2"/>
          </svg>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-amber-400 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
          APEX STRIKE 3D
        </h1>
        <p className="text-xs md:text-sm font-mono tracking-widest text-cyan-300/80 uppercase mt-1 mb-6">
          TACTICAL FIRST-PERSON SHOOTER · REALISTIC BALLISTICS
        </p>

        {/* Tactical Map Selector */}
        <div className="w-full max-w-lg mb-6">
          <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-2">DEPLOYMENT ARENA</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(MAPS).map((map) => {
              const isSelected = selectedMap === map.id;
              return (
                <button
                  key={map.id}
                  onClick={() => {
                    onSelectMap(map.id);
                    soundEngine.playClick();
                  }}
                  className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-500 text-slate-400'
                  }`}
                >
                  <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {map.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                    {map.theme}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          <button
            data-start="true"
            onClick={() => onStartGame('solo')}
            className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black tracking-widest uppercase text-base shadow-[0_0_25px_rgba(6,182,212,0.5)] transition transform hover:scale-[1.02] active:scale-[0.98]"
          >
            ENTER COMBAT (SOLO / BOTS)
          </button>

          <button
            onClick={() => onStartGame('matchmaking')}
            className="w-full py-3.5 px-6 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-bold tracking-wider uppercase text-sm transition shadow-[0_0_15px_rgba(0,0,0,0.5)]"
          >
            MULTIPLAYER MATCHMAKING
          </button>
        </div>
      </div>

      {/* Flat Control Hints in Bottom Margin */}
      <div className="w-full text-center text-[11px] md:text-xs text-slate-400 font-mono tracking-wider border-t border-slate-800/80 pt-3">
        WASD Move · Click Aim & Fire · Space Jump · C Crouch · R Reload · 1-4 Weapons · Esc Pause · Dual Touch Controls on Mobile
      </div>
    </div>
  );
};
