import { createContext } from 'react'
import { Ranking, TournamentMatch } from '../api'

/** Stage of the tournament */
export enum TournamentState {
  /** Default */
  Unknown,
  /** Starting soon, not started */
  NotStarted,
  InProgress,
  /** Just finished, wrapping up */
  Finished
}

/** Object that has all relevant info for the current state of the tournament */
interface TournamentInfo {
  /** Status on it being started/etc. */
  state: TournamentState
  /** The date it will start. Should be `null` if there is no date decided, or `undefined` if it hasn't been fetched yet. */
  date: Date | null | undefined
  /** Ranking of the current phase of the tournament */
  ranking: Ranking
  /** Info of all players in tournament */
  playerInfo: { [id: number]: string }
  /** Whether or not tournament is in first phase (is always `true`, unless the tournament is running and not in first phase) */
  isFirstPhase: boolean
  /** Array with upcoming matches in the tournament */
  upcomingMatches: TournamentMatch[]
}

/** Context keeping all relevant state information of the tournament */
export const TournamentContext = createContext<TournamentInfo>({
  state: TournamentState.Unknown,
  date: undefined,
  ranking: [],
  playerInfo: {},
  isFirstPhase: true,
  upcomingMatches: []
})
