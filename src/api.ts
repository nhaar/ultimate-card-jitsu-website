import { getJSON } from "./utils";

/**
 * Checks if a tournament is active
 * @returns `true` if the tournament is active, `false` otherwise
 */
export async function isTournamentActive(): Promise<boolean> {
  const response = await getJSON("api/tournament/active");
  if (response === null) {
    return false
  } else {
    return (response as { active: boolean }).active;
  }
}

/**
 * Get a list of all player names that have a registered account
 * @returns 
 */
export async function getAllPlayers(): Promise<string[]> {
  const response = await getJSON("api/user/all-players");
  if (response === null) {
    return []
  } else {
    return (response as string[]);
  }
}