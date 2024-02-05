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
