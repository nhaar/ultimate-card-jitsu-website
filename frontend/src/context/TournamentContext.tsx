import { createContext } from 'react'
import { Ranking, TournamentMatch } from '../api'

/** Stage of the tournament */
export enum TournamentState {
  /** Default */
  Unknown,
  /** Starting soon, not started */
  NotStarted,
  /** It's already the time to begin the tournament, but it hasn't officially begun */
  WaitingStart,
  InProgress,
  /** Just finished, wrapping up */
  Finished
}

/** Object that has all relevant info for the current state of the tournament */
export interface TournamentInfo {
  /** Status on it being started/etc. */
  state: TournamentState
  /** React setter for the state */
  setState?: React.Dispatch<React.SetStateAction<TournamentState>>
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

/** A package of information telling what needs to be updated. */
export interface TournamentUpdate {
  /** If set to `true`, will force to update everything  */
  updateAll?: boolean
  /** If set to `true`, will force to udpate the state */
  updateState?: boolean
  /** If set to `true`, will force to update the date */
  updateDate?: boolean
  /** If set to `true`, will force update of all score related things */
  scoreUpdate?: boolean
  /** If set to `true`, will force to fetch all player info */
  playerInfo?: boolean
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

// need to use this because of parsing error with ts-standard
const defaultFunction = (): void => { throw new Error('Not implemented') }

/** Context to keep the function used for sending an update of the tournament information to the WebSocket */
export const TournamentUpdateContext = createContext<(update: TournamentUpdate) => void>(defaultFunction)
