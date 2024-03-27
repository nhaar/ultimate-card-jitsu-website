import { isObject } from '../utils/utils'
import Database from './database'

/** All player data */
export interface PlayerInfo {
  /** Id as in the database */
  id: number
  /** Name for readability only */
  name: string
}

/** Possible tournaments */
export type TournamentType = 'single-elimination' | 'double-elimination' | 'fire'

/** Interface for the object that's stored as a JSON in the database */
interface TournamentObject {
  // left optional because when this is stored as a backup it doesn't have this property, to avoid circular backup and exponential growth of memory
  backups?: string[]
  /** Info from all players in the tournament */
  players: PlayerInfo[]
  /** Whether or not the tournament is finished */
  isFinished: boolean
  /** Identifier for what tournament it is */
  type: TournamentType
  tournamentSpecific: any
}

/** Generic information for a match of any format.  */
export interface Matchup {
  /** Player ID of all players that will play, or a descriptor if a user is not yet decided. */
  players: Array<number | string>
  n: number
}

/** List of player IDs */
type PlayerList = number[]

/** Array structure for how the standings should look like, order player IDs from first to last, and ties are handled with the same number in an array */
export type FinalStandings = Array<number | number[]>

/** Base class for an ongoing tournament. */
export default abstract class Tournament {
  /** Contains multiple backups of the tournament as serialized JSON, with the first element being the most recent one */
  backups: string[] = []

  /** Info for all players in the tournament */
  players: PlayerInfo[] = []

  /** Whether or not the tournament has ended */
  isFinished: boolean

  /** If this is an instance of a specific tournament, should specificy which one */
  type?: TournamentType

  /** Creates the tournament from the JSON object in the database (that is, already parsed here as an object) */
  constructor (tournamentObject: TournamentObject)

  /** Creates the tournament from scratch by giving in all the players that will play */
  constructor (players: PlayerInfo[])

  constructor (value: TournamentObject | PlayerInfo[]) {
    // Because of how the constructor works, derived classes must manually implement solutions to reading the given value, they must follow
    // the derived class constructor should account for when the data is the player info array or when it's data from the
    // database
    if (this.isTournamentObject(value)) {
      this.backups = value.backups ?? []
      this.players = value.players
      this.isFinished = value.isFinished
    } else {
      this.players = value
      this.isFinished = false
    }
  }

  /**
   * Method that implements a way of checking if an object is of the interface used for the "tournament specific" part of the data
   * @param tournamentSpecific Value that will be compared
   */
  abstract isSpecificTournamentObject (tournamentSpecific: any): boolean

  /** Method that implements getting the object that represents the "tournament specific" data. */
  abstract getSpecificData (): any

  /**
   * Serialize the data as a JSON string
   * @param withBackups Whether or not the JSON should contain the backups
   * @returns Serialized data
   */
  serializeData (withBackups: boolean): string {
    if (this.type === undefined) {
      throw new Error('Trying to serialize data but no object type found')
    }
    const data: TournamentObject = {
      backups: withBackups ? this.backups : undefined,
      players: this.players,
      isFinished: this.isFinished,
      type: this.type,
      tournamentSpecific: this.getSpecificData()
    }
    return JSON.stringify(data)
  }

  /**
   * Saves the tournament to the database
   * @param createBackup Whether or not to create a backup of the tournament before saving it
   */
  async save (createBackup: boolean = true): Promise<void> {
    if (createBackup) {
      this.backups.splice(0, 0, this.serializeData(false))
    }
    const db = new Database()

    const getQuery = await db.getQuery('SELECT * FROM tournament', [])
    const serialized = this.serializeData(true)
    if (getQuery.rows.length === 0) {
      await db.getQuery('INSERT INTO tournament (data) VALUES ($1)', [serialized])
    } else {
      await db.getQuery('UPDATE tournament SET data = $1', [serialized])
    }
  }

  /**
   * Check whether a value corresponds to a tournament object
   * @param value Value to test
   * @returns `true` if it is a tournament object
   */
  isTournamentObject (value: any): value is TournamentObject {
    if (!isObject(value)) {
      return false
    }
    if (value.backups !== undefined) {
      if (!Array.isArray(value.backups)) {
        return false
      } else {
        if (value.backups.every((v: any) => ((typeof v) === 'string')) === false) {
          return false
        }
      }
    }
    if (!Array.isArray(value.players) || value.players.every(Tournament.isPlayerInfo) === false) {
      return false
    }
    if (!this.isSpecificTournamentObject(value.tournamentSpecific)) {
      return false
    }
    if (typeof value.type !== 'string') {
      return false
    }
    return true
  }

  /**
   * Checks if a value is a player info object
   * @param obj Value to check
   * @returns `true` if it is
   */
  static isPlayerInfo (obj: any): obj is PlayerInfo {
    if (!isObject(obj)) {
      return false
    }

    if (typeof (obj.id) !== 'number' || typeof (obj.name) !== 'string') {
      return false
    }

    return true
  }

  /** Returns a map of all players in the tournament from their IDs to their name */
  getPlayerInfo (): { [id: number]: string } {
    const playerInfo: { [id: number]: string } = {}
    for (const player of this.players) {
      playerInfo[player.id] = player.name
    }
    return playerInfo
  }

  /** Method that implements getting all the players in the order they ranked at the end */
  abstract getFinalStandings (): FinalStandings

  /** Method that implements a way of getting the upcoming matchups */
  abstract getMatchups (): Matchup[]

  /** Gets a list of all decided matchups in the order they will appear. Each element of the list is just the list of player IDs in the match */
  getDecidedMatchups (): PlayerList[] {
    const matchups = this.getMatchups()
    const decided = []
    for (const matchup of matchups) {
      const playerList: number[] = []
      let isDecided = true
      for (const player of matchup.players) {
        if (typeof player !== 'number') {
          isDecided = false
          break
        } else {
          playerList.push(player)
        }
      }
      if (isDecided) {
        decided.push(playerList)
      }
    }

    return decided
  }

  static async tournamentExists (): Promise<boolean> {
    const db = new Database()
    const query = await db.getQuery('SELECT * FROM tournament', [])
    return query.rows.length > 0
  }

  /**
   * Get the scheduled date for the tournament
   * @returns Timestamp of the date in string format and in miliseconds since start of unix, or null if it hasn't been set
   */
  static async getTournamentDate (): Promise<string | null> {
    const db = new Database()
    const query = await db.getQuery('SELECT * FROM tournament_date', [])
    if (query.rows.length === 0) {
      return null
    } else {
      return query.rows[0].date
    }
  }

  /** Deletes an active tournament */
  static async deleteTournament (): Promise<void> {
    const db = new Database()
    await db.getQuery('DELETE FROM tournament', [])
  }

  /**
   * Updates date for the start of the tournament
   * @param date Miliseconds since epoch in string format
   */
  static async setTournamentDate (date: string): Promise<void> {
    const db = new Database()
    const query = await db.getQuery('SELECT * FROM tournament_date', [])
    if (query.rows.length === 0) {
      await db.getQuery('INSERT INTO tournament_date (date) VALUES ($1)', [date])
    } else {
      await db.getQuery('UPDATE tournament_date SET date = $1', [date])
    }
  }

  /** Removes the scheduled tournament date */
  static async removeTournamentDate (): Promise<void> {
    const db = new Database()
    await db.getQuery('DELETE FROM tournament_date', [])
  }
}
