import { getJSON, postJSON } from './utils'

/**
 * Checks if a tournament is active
 * @returns `true` if the tournament is active, `false` otherwise
 */
export async function isTournamentActive (): Promise<boolean> {
  const response = await getJSON('api/tournament/active')
  if (response === null) {
    return false
  } else {
    return (response as { active: boolean }).active
  }
}

/**
 * Get a list of all player names that have a registered account
 * @returns
 */
export async function getAllPlayers (): Promise<string[]> {
  const response = await getJSON('api/user/all-players')
  if (response === null) {
    return []
  } else {
    return (response as string[])
  }
}

/**
 * Creates a tournament with the given player names
 * @param players 
 * @returns `true` if the tournament was created successfully, `false` otherwise
 */
export async function createTournament (players: string[]): Promise<boolean> {
  const response = await postJSON('api/tournament/create', { players })
  return response.ok
}

/** Copy of the backend data */
export interface TournamentMatch {
  runners: number[]
  standings: number[]
}

export async function getTournamentMatches (): Promise<TournamentMatch[]> {
  const response = await getJSON('api/tournament/matches')
  if (response === null) {
    throw new Error('Failed to get tournament matches')
  }
  return response as TournamentMatch[]
}