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

/**
 * Updates a match score
 * @param matchIndex Index of the match (index in tournament matches array)
 * @param standings Standings object of the match (array of player ID in order of standing)
 * @returns `true` if the match was updated successfully, `false` otherwise
 */
export async function updateMatchScore (matchIndex: number, standings: number[]): Promise<boolean> {
  const response = await postJSON('api/tournament/update-score', { matchIndex, standings })
  return response.ok
}

export interface TournamentTies {
  exists: boolean
  ties: { [points: number]: number[] }
}

export async function getTies (): Promise<TournamentTies> {
  const response = await getJSON('api/tournament/tie')
  if (response === null) {
    throw new Error('Failed to get tournament ties')
  }
  return response as TournamentTies
}

export async function settleTie (points: number, winners: number[]): Promise<boolean> {
  const response = await postJSON('api/tournament/settle-tie', { points, winners })
  return response.ok
}

/** Get info of players participating in the tournament */
export async function getPlayerInfo (): Promise<{ [id: number]: string }> {
  const response = await getJSON('api/tournament/players-info')
  if (response === null) {
    throw new Error('Failed to get player info')
  }
  return response as { [id: number]: string }
}