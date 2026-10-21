/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, GameHUDState } from './game/engine.ts';
import { WEAPONS } from './game/ballistics.ts';
import { soundEngine } from './game/audio.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { GameHUD } from './components/GameHUD.tsx';
import { StatusModals } from './components/StatusModals.tsx';
import { LobbyModal } from './components/LobbyModal.tsx';
import { auth, googleProvider, signInWithPopup } from './services/firebase.ts';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getUserProfile, createOrUpdateUserProfile, recordMatchProgress, UserProfile } from './services/userService.ts';
import { quickMatchmake, subscribeToLobby, leaveLobby, LobbyData, MatchPlayer } from './services/multiplayerService.ts';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Shell State Machine: 'title' | 'lobby' | 'playing' | 'paused' | 'victory' | 'defeat'
  const [gameState, setGameState] = useState<'title' | 'lobby' | 'playing' | 'paused' | 'victory' | 'defeat'>('title');
  const [selectedMap, setSelectedMap] = useState<string>('dust');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // User & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Multiplayer Lobby State
  const [currentLobby, setCurrentLobby] = useState<LobbyData | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<MatchPlayer[]>([]);
  const [isSearchingMatch, setIsSearchingMatch] = useState<boolean>(false);

  // Live HUD State (Throttled ~10Hz from engine)
  const [hudState, setHudState] = useState<GameHUDState>({
    health: 100,
    maxHealth: 100,
    armor: 50,
    scoreAlpha: 0,
    scoreBravo: 0,
    timeRemaining: 300,
    currentWeapon: WEAPONS.viper4,
    ammo: 30,
    reserveAmmo: 120,
    isReloading: false,
    isADS: false,
    isCrouching: false,
    kills: 0,
    deaths: 0,
    headshots: 0,
    hitmarker: null,
    gameStatus: 'title',
    activeMap: 'dust'
  });

  // Keep body dataset state in sync for Ultra Mode and CSS rules
  useEffect(() => {
    const bodyState = gameState === 'victory' || gameState === 'defeat'
      ? 'gameover'
      : gameState === 'paused'
      ? 'paused'
      : gameState === 'playing'
      ? 'playing'
      : 'title';
    document.body.dataset.state = bodyState;
  }, [gameState]);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            profile = await createOrUpdateUserProfile(user.uid, {
              displayName: user.displayName || 'Soldier',
              callsign: user.displayName ? user.displayName.split(' ')[0].slice(0, 15) : 'Soldier_1'
            });
          }
          setUserProfile(profile);
        } catch (e) {
          console.warn('Profile load notice:', e);
        }
      } else {
        // Local Guest Soldier profile without calling unauthorized anonymous auth
        const localGuestCallsign = `Ghost_${Math.floor(1000 + Math.random() * 9000)}`;
        setUserProfile({
          userId: 'guest_soldier',
          displayName: 'Guest Soldier',
          callsign: localGuestCallsign,
          level: 1,
          xp: 0,
          rank: 'Recruit',
          kills: 0,
          deaths: 0,
          wins: 0,
          matchesPlayed: 0,
          accuracy: 0,
          primaryWeapon: 'viper4',
          secondaryWeapon: 'titan45',
          selectedMap: 'dust',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });

    return () => unsub();
  }, []);

  // 2. Initialize Game Engine once mounted in stable ref
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current, selectedMap);
    engineRef.current = engine;

    engine.onHUDUpdate = (newHud) => {
      setHudState(newHud);
    };

    engine.onMatchEnd = (isVictory) => {
      const outcomeState = isVictory ? 'victory' : 'defeat';
      setGameState(outcomeState);
      document.exitPointerLock?.();

      // Persist match stats to Firestore
      if (currentUser) {
        recordMatchProgress(currentUser.uid, {
          kills: engine.kills,
          deaths: engine.deaths,
          isWinner: isVictory,
          shotsFired: engine.shotsFired,
          shotsHit: engine.shotsHit,
          score: (engine.kills * 100) + (engine.headshots * 50) + (isVictory ? 500 : 150)
        }).then((updatedProfile) => {
          if (updatedProfile) setUserProfile(updatedProfile);
        }).catch(() => {});
      }
    };

    // Auto-start support (?autostart=1)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      startPlaying();
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Handle Map Change
  const handleSelectMap = (mapId: string) => {
    setSelectedMap(mapId);
    if (engineRef.current) {
      engineRef.current.loadMap(mapId);
    }
  };

  // Keyboard Handshake for Title Screen (Enter/Space to start) & Pause (Esc/P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        startPlaying();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'playing') {
          setGameState('paused');
          document.exitPointerLock?.();
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      } else if (e.code === 'KeyM') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startPlaying = () => {
    setGameState('playing');
    if (engineRef.current) {
      engineRef.current.health = 100;
      engineRef.current.armor = 50;
      engineRef.current.scoreAlpha = 0;
      engineRef.current.scoreBravo = 0;
      engineRef.current.timeRemaining = 300;
      engineRef.current.kills = 0;
      engineRef.current.deaths = 0;
      engineRef.current.headshots = 0;
      engineRef.current.isGameOver = false;
      engineRef.current.botManager.spawnBots(4, selectedMap);
    }
  };

  // Google Sign-In with Firebase Auth
  const handleGoogleSignIn = async () => {
    try {
      soundEngine.playClick();
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        setCurrentUser(res.user);
        const profile = await createOrUpdateUserProfile(res.user.uid, {
          displayName: res.user.displayName || 'Soldier',
          callsign: res.user.displayName ? res.user.displayName.split(' ')[0].slice(0, 15) : 'ApexSoldier',
          avatarUrl: res.user.photoURL || ''
        });
        setUserProfile(profile);
      }
    } catch (e) {
      console.warn('Google sign-in completed or cancelled:', e);
    }
  };

  // Multiplayer Matchmaking
  const handleStartMatchmaking = async () => {
    soundEngine.playClick();

    if (!currentUser) {
      // Invite player to sync with Google for real-time cloud matchmaking
      try {
        const res = await signInWithPopup(auth, googleProvider);
        if (res.user) {
          setCurrentUser(res.user);
          const profile = await createOrUpdateUserProfile(res.user.uid, {
            displayName: res.user.displayName || 'Soldier',
            callsign: res.user.displayName ? res.user.displayName.split(' ')[0].slice(0, 15) : 'ApexSoldier',
            avatarUrl: res.user.photoURL || ''
          });
          setUserProfile(profile);
        }
      } catch (e) {
        console.warn('Google sign-in for matchmaking cancelled or deferred.');
      }
    }

    const uid = currentUser?.uid || `soldier_${Date.now()}`;
    const name = userProfile?.callsign || 'ApexSoldier';

    setIsSearchingMatch(true);
    setGameState('lobby');

    try {
      const { lobby } = await quickMatchmake(uid, name, selectedMap);
      setCurrentLobby(lobby);
      setIsSearchingMatch(false);

      // Subscribe to real-time changes in lobby
      subscribeToLobby(lobby.id, (updatedLobby, players) => {
        if (!updatedLobby) {
          setGameState('title');
          return;
        }
        setCurrentLobby(updatedLobby);
        setLobbyPlayers(players);
      });
    } catch (e) {
      console.warn('Matchmaking fallback to combat:', e);
      setIsSearchingMatch(false);
      startPlaying();
    }
  };

  const handleCancelLobby = () => {
    soundEngine.playClick();
    if (currentLobby && currentUser) {
      leaveLobby(currentLobby.id, currentUser.uid);
    }
    setCurrentLobby(null);
    setGameState('title');
  };

  const toggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Touch event forwarding to engine's input manager
  const handleTouchStart = (e: React.TouchEvent) => {
    if (engineRef.current) engineRef.current.inputManager.handleTouchStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (engineRef.current) engineRef.current.inputManager.handleTouchMove(e);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (engineRef.current) engineRef.current.inputManager.handleTouchEnd(e);
  };

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-black select-none touch-none"
      onTouchStart={gameState === 'playing' ? handleTouchStart : undefined}
      onTouchMove={gameState === 'playing' ? handleTouchMove : undefined}
      onTouchEnd={gameState === 'playing' ? handleTouchEnd : undefined}
    >
      {/* Isolated Three.js Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="three-canvas"
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />

      {/* Screen 1: Title Screen & Landing Shell */}
      {gameState === 'title' && (
        <TitleScreen
          userProfile={userProfile}
          selectedMap={selectedMap}
          onSelectMap={handleSelectMap}
          onStartGame={(mode) => {
            if (mode === 'matchmaking') handleStartMatchmaking();
            else startPlaying();
          }}
          onGoogleSignIn={handleGoogleSignIn}
          onGuestPlay={startPlaying}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}

      {/* Screen 2: Multiplayer Matchmaking Lobby */}
      {gameState === 'lobby' && (
        <LobbyModal
          lobby={currentLobby}
          players={lobbyPlayers}
          currentUserId={currentUser?.uid || ''}
          isSearching={isSearchingMatch}
          onStartMatch={startPlaying}
          onCancel={handleCancelLobby}
        />
      )}

      {/* Screen 3: Playing HUD (Low-occlusion, >=85% clear) */}
      {gameState === 'playing' && (
        <GameHUD
          state={hudState}
          onFireTouchStart={() => {
            if (engineRef.current) engineRef.current.inputManager.isFiring = true;
          }}
          onFireTouchEnd={() => {
            if (engineRef.current) engineRef.current.inputManager.isFiring = false;
          }}
          onToggleADS={() => {
            if (engineRef.current) {
              engineRef.current.inputManager.isADS = !engineRef.current.inputManager.isADS;
              soundEngine.playClick();
            }
          }}
          onJump={() => {
            if (engineRef.current) engineRef.current.inputManager.justJumped = true;
          }}
          onCrouch={() => {
            if (engineRef.current) {
              engineRef.current.inputManager.isCrouching = !engineRef.current.inputManager.isCrouching;
              soundEngine.playClick();
            }
          }}
          onReload={() => {
            if (engineRef.current) engineRef.current.reload();
          }}
          onSwitchWeapon={(idx) => {
            if (engineRef.current) engineRef.current.switchWeapon(idx);
          }}
          onPause={() => {
            setGameState('paused');
            document.exitPointerLock?.();
          }}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          isJoystickActive={engineRef.current?.inputManager.isJoystickActive || false}
          joystickCurrent={engineRef.current?.inputManager.joystickCurrent || { x: 0, y: 0 }}
        />
      )}

      {/* Screen 4: Status Modals (Pause, Victory, Defeat) */}
      {(gameState === 'paused' || gameState === 'victory' || gameState === 'defeat') && (
        <StatusModals
          status={gameState}
          hudState={hudState}
          shotsFired={engineRef.current?.shotsFired || 0}
          shotsHit={engineRef.current?.shotsHit || 0}
          damageDealt={engineRef.current?.damageDealt || 0}
          onResume={() => setGameState('playing')}
          onRestart={startPlaying}
          onExitToTitle={() => setGameState('title')}
        />
      )}
    </main>
  );
}
