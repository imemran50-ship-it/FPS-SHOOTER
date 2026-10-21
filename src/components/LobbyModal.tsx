import React from 'react';
import { LobbyData, MatchPlayer } from '../services/multiplayerService.ts';
import { MAPS } from '../game/maps.ts';

interface LobbyModalProps {
  lobby: LobbyData | null;
  players: MatchPlayer[];
  currentUserId: string;
  isSearching: boolean;
  onStartMatch: () => void;
  onCancel: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  lobby,
  players,
  currentUserId,
  isSearching,
  onStartMatch,
  onCancel
}) => {
  const mapName = lobby ? MAPS[lobby.mapId]?.name || lobby.mapId : 'Dust Protocol';
  const isHost = lobby?.hostId === currentUserId;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 pointer-events-auto select-none">
      <div className="w-full max-w-xl rounded-2xl bg-[#090f1e] border border-cyan-500/40 p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <h3 className="text-xl font-black font-mono tracking-wider text-slate-100 uppercase">
                {isSearching ? 'FINDING ACTIVE COMBAT SQUAD...' : lobby?.name || 'TACTICAL SQUAD LOBBY'}
              </h3>
            </div>
            <p className="text-xs font-mono text-cyan-400 mt-0.5">
              ARENA: {mapName.toUpperCase()} · MODE: TEAM DEATHMATCH (TDM)
            </p>
          </div>

          <button
            onClick={onCancel}
            className="text-xs font-mono px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            LEAVE
          </button>
        </div>

        {/* Searching Status or Squad Slot List */}
        {isSearching ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin mb-4" />
            <p className="text-sm font-mono text-slate-300 mb-1">Scanning tactical network for open lobbies...</p>
            <p className="text-xs font-mono text-slate-500">Connecting soldier node to Firebase cluster</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span>SQUAD ROSTER ({players.length} / {lobby?.maxPlayers || 8})</span>
              <span>HOST: {isHost ? 'YOU' : 'SOLDIER'}</span>
            </div>

            {/* Team Alpha and Bravo columns */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Alpha Team */}
              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30">
                <div className="text-xs font-mono font-bold text-cyan-400 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>ALPHA SQUAD</span>
                </div>
                <div className="space-y-1.5">
                  {players.filter((p) => p.team === 'alpha').map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-1.5 rounded bg-slate-900/80 text-xs font-mono">
                      <span className="text-slate-200">{p.displayName}</span>
                      {p.userId === lobby?.hostId && (
                        <span className="text-[10px] text-amber-400 font-bold">HOST</span>
                      )}
                    </div>
                  ))}
                  {players.filter((p) => p.team === 'alpha').length === 0 && (
                    <div className="text-[11px] font-mono text-slate-600 italic">No operators assigned</div>
                  )}
                </div>
              </div>

              {/* Bravo Team */}
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30">
                <div className="text-xs font-mono font-bold text-red-400 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>BRAVO SQUAD</span>
                </div>
                <div className="space-y-1.5">
                  {players.filter((p) => p.team === 'bravo').map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-1.5 rounded bg-slate-900/80 text-xs font-mono">
                      <span className="text-slate-200">{p.displayName}</span>
                    </div>
                  ))}
                  {players.filter((p) => p.team === 'bravo').length === 0 && (
                    <div className="text-[11px] font-mono text-slate-600 italic">Searching for combatants...</div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                data-start="true"
                onClick={onStartMatch}
                className="w-full py-3.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black tracking-wider uppercase text-sm shadow transition"
              >
                {isHost ? 'DEPLOY SQUAD TO COMBAT' : 'READY TO DEPLOY'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
