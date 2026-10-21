import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  limit,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';

export interface LobbyData {
  id: string;
  name: string;
  mapId: string;
  gameMode: string;
  hostId: string;
  status: 'waiting' | 'in_progress' | 'ended';
  playerCount: number;
  maxPlayers: number;
  createdAt: string;
  updatedAt: string;
}

export interface MatchPlayer {
  id: string;
  userId: string;
  displayName: string;
  team: 'alpha' | 'bravo';
  kills: number;
  deaths: number;
  score: number;
  health: number;
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
  isFiring?: boolean;
  weaponId: string;
  updatedAt: string;
}

export async function createLobby(
  hostId: string,
  hostName: string,
  mapId: string = 'dust',
  gameMode: string = 'TDM'
): Promise<LobbyData> {
  const lobbyId = `lobby_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const path = `lobbies/${lobbyId}`;
  try {
    const now = new Date().toISOString();
    const lobby: LobbyData = {
      id: lobbyId,
      name: `${hostName}'s Squad`,
      mapId,
      gameMode,
      hostId,
      status: 'waiting',
      playerCount: 1,
      maxPlayers: 8,
      createdAt: now,
      updatedAt: now
    };

    const lobbyRef = doc(db, 'lobbies', lobbyId);
    await setDoc(lobbyRef, lobby);

    // Add host as player
    const playerRef = doc(db, `lobbies/${lobbyId}/players`, hostId);
    const hostPlayer: MatchPlayer = {
      id: hostId,
      userId: hostId,
      displayName: hostName,
      team: 'alpha',
      kills: 0,
      deaths: 0,
      score: 0,
      health: 100,
      posX: 0,
      posY: 1.5,
      posZ: 0,
      rotY: 0,
      weaponId: 'viper4',
      updatedAt: now
    };
    await setDoc(playerRef, hostPlayer);

    return lobby;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function joinLobby(
  lobbyId: string,
  userId: string,
  displayName: string,
  currentCount: number
): Promise<void> {
  const path = `lobbies/${lobbyId}/players/${userId}`;
  try {
    const now = new Date().toISOString();
    const team: 'alpha' | 'bravo' = currentCount % 2 === 0 ? 'alpha' : 'bravo';

    const player: MatchPlayer = {
      id: userId,
      userId,
      displayName,
      team,
      kills: 0,
      deaths: 0,
      score: 0,
      health: 100,
      posX: team === 'alpha' ? -15 : 15,
      posY: 1.5,
      posZ: team === 'alpha' ? -25 : 25,
      rotY: 0,
      weaponId: 'viper4',
      updatedAt: now
    };

    await setDoc(doc(db, `lobbies/${lobbyId}/players`, userId), player);
    await updateDoc(doc(db, 'lobbies', lobbyId), {
      playerCount: Math.min(8, currentCount + 1),
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function quickMatchmake(
  userId: string,
  displayName: string,
  preferredMap: string = 'dust'
): Promise<{ lobby: LobbyData; isNew: boolean }> {
  const path = 'lobbies';
  try {
    // Find open waiting lobbies
    const q = query(
      collection(db, 'lobbies'),
      where('status', '==', 'waiting'),
      limit(5)
    );
    const snap = await getDocs(q);

    for (const docSnap of snap.docs) {
      const lobby = docSnap.data() as LobbyData;
      if (lobby.playerCount < lobby.maxPlayers) {
        await joinLobby(lobby.id, userId, displayName, lobby.playerCount);
        return { lobby, isNew: false };
      }
    }

    // No available open lobby found, create a new one
    const newLobby = await createLobby(userId, displayName, preferredMap, 'TDM');
    return { lobby: newLobby, isNew: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToLobby(
  lobbyId: string,
  onUpdate: (lobby: LobbyData | null, players: MatchPlayer[]) => void
): Unsubscribe {
  const lobbyPath = `lobbies/${lobbyId}`;
  const playersPath = `lobbies/${lobbyId}/players`;

  let currentLobby: LobbyData | null = null;
  let currentPlayers: MatchPlayer[] = [];

  const unsubLobby = onSnapshot(
    doc(db, 'lobbies', lobbyId),
    (snap) => {
      if (!snap.exists()) {
        currentLobby = null;
        onUpdate(null, []);
        return;
      }
      currentLobby = snap.data() as LobbyData;
      onUpdate(currentLobby, currentPlayers);
    },
    (err) => handleFirestoreError(err, OperationType.GET, lobbyPath)
  );

  const unsubPlayers = onSnapshot(
    collection(db, `lobbies/${lobbyId}/players`),
    (snap) => {
      currentPlayers = snap.docs.map((d) => d.data() as MatchPlayer);
      if (currentLobby) {
        onUpdate(currentLobby, currentPlayers);
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, playersPath)
  );

  return () => {
    unsubLobby();
    unsubPlayers();
  };
}

export async function updatePlayerTelemetry(
  lobbyId: string,
  player: MatchPlayer
): Promise<void> {
  const path = `lobbies/${lobbyId}/players/${player.id}`;
  try {
    const ref = doc(db, `lobbies/${lobbyId}/players`, player.id);
    await setDoc(ref, {
      ...player,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function leaveLobby(lobbyId: string, playerId: string): Promise<void> {
  const path = `lobbies/${lobbyId}/players/${playerId}`;
  try {
    const playerRef = doc(db, `lobbies/${lobbyId}/players`, playerId);
    await deleteDoc(playerRef);
  } catch (error) {
    // Graceful leave
  }
}
