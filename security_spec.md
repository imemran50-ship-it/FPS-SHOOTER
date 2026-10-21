# Security Specification: ApexStrike 3D FPS

## 1. Data Invariants
- **User Profile Ownership**: `/users/{userId}` can only be read by anyone (public leaderboard/callsign) or self, and written only if `request.auth.uid == userId`.
- **Identity Integrity**: Users cannot update or spoof other players' statistics (kills, deaths, rank).
- **Lobby Management**: `/lobbies/{lobbyId}` can be created by authenticated users (`hostId == request.auth.uid`). Host can start or close lobbies. Players joining can increment player count.
- **Match Telemetry**: `/lobbies/{lobbyId}/players/{playerId}` can only be written by the authenticated player (`request.auth.uid == incoming().userId`).
- **Bounded Properties**: Every string has explicit length limits (`<= 128` chars for IDs, `<= 60` for names). Numbers are validated.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Unauthenticated User Write**: Anonymous non-authed request to `/users/soldier123`.
2. **User ID Spoofing**: User `attacker` attempting to write `/users/victim` profile.
3. **Ghost Fields Injection**: Adding `isAdmin: true` or `godMode: true` into `User` document.
4. **Oversized Callsign**: Sending a callsign with 5,000 characters to crash UI / cause wallet denial.
5. **Negative Combat Stats**: Setting `kills: -100` or `level: 0`.
6. **Lobby Host Hijack**: Changing `hostId` of an existing lobby to an attacker UID.
7. **Player Count Overflow**: Updating `playerCount: 9999` exceeding `maxPlayers: 10`.
8. **Malicious Match Player Write**: User `attacker` updating `/lobbies/123/players/victim` coordinates/health.
9. **Fake Server Weapon**: Setting `weaponId` to an unapproved 500-char string with shell injection.
10. **Type Mismatch on Health**: Setting `health: "immortal"` instead of a number.
11. **Negative Coordinates Abuse**: Sending NaN or infinite coordinates.
12. **Blanket Query Scraping**: Malicious query without proper filters.
