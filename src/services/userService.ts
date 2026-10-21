import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import { calculateLevelFromXP, calculateRankFromLevel } from '../game/rules.ts';

export interface UserProfile {
  userId: string;
  displayName?: string;
  callsign: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  rank: string;
  kills: number;
  deaths: number;
  wins: number;
  matchesPlayed: number;
  accuracy: number;
  primaryWeapon?: string;
  secondaryWeapon?: string;
  selectedMap?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createOrUpdateUserProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<UserProfile> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const existing = await getDoc(docRef);

    const now = new Date().toISOString();
    let profile: UserProfile;

    if (!existing.exists()) {
      const callsign = data.callsign || (data.displayName ? data.displayName.slice(0, 15) : `Ghost_${Math.floor(1000 + Math.random() * 9000)}`);
      profile = {
        userId,
        displayName: data.displayName || callsign,
        callsign,
        avatarUrl: data.avatarUrl || '',
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
        createdAt: now,
        updatedAt: now
      };
      await setDoc(docRef, profile);
    } else {
      const current = existing.data() as UserProfile;
      profile = {
        ...current,
        ...data,
        updatedAt: now
      };
      // Recalculate level and rank if XP changed
      if (profile.xp !== undefined) {
        profile.level = calculateLevelFromXP(profile.xp);
        profile.rank = calculateRankFromLevel(profile.level);
      }
      await updateDoc(docRef, profile as Record<string, any>);
    }
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function recordMatchProgress(
  userId: string,
  match: {
    kills: number;
    deaths: number;
    isWinner: boolean;
    shotsFired: number;
    shotsHit: number;
    score: number;
  }
): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const current = await getUserProfile(userId);
    if (!current) return null;

    const newKills = current.kills + match.kills;
    const newDeaths = current.deaths + match.deaths;
    const newWins = current.wins + (match.isWinner ? 1 : 0);
    const newMatches = current.matchesPlayed + 1;
    const newXP = current.xp + match.score;
    const newLevel = calculateLevelFromXP(newXP);
    const newRank = calculateRankFromLevel(newLevel);

    const totalFired = (current.matchesPlayed * 50) + match.shotsFired;
    const totalHit = (current.matchesPlayed * 50 * (current.accuracy / 100)) + match.shotsHit;
    const newAccuracy = totalFired > 0 ? Math.min(100, Math.round((totalHit / totalFired) * 100)) : 0;

    const updatedData: Partial<UserProfile> = {
      kills: newKills,
      deaths: newDeaths,
      wins: newWins,
      matchesPlayed: newMatches,
      xp: newXP,
      level: newLevel,
      rank: newRank,
      accuracy: newAccuracy,
      updatedAt: new Date().toISOString()
    };

    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, updatedData);
    return { ...current, ...updatedData };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getTopSoldiers(maxCount: number = 10): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'), orderBy('kills', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
