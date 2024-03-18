import { isObject } from '../utils/utils'
import Database from './database'

/** All player data */
export interface PlayerInfo {
  /** Id as in the database */
  id: number
  /** Name for readability only */
  name: string
}

/** Interface for the object that's stored as a JSON in the database */
interface TournamentObject {
  // left optional because when this is stored as a backup it doesn't have this property, to avoid circular backup and exponential growth of memory
  backups?: string[]
  /** Info from all players in the tournament */
  players: PlayerInfo[]
  tournamentSpecific: any

}

/** Base class for an ongoing tournament. */
export default abstract class Tournament {
  /** Contains multiple backups of the tournament as serialized JSON, with the first element being the most recent one */
  backups: string[] = []

  /** Info for all players in the tournament */
  players: PlayerInfo[] = []

  /** Creates the tournament from the JSON object in the database (that is, already parsed here as an object) */
  constructor (tournamentObject: TournamentObject)

  /** Creates the tournament from scratch by giving in all the players that will play */
  constructor (players: PlayerInfo[])

  constructor (value: TournamentObject | PlayerInfo[]) {
    if (this.isTournamentObject(value)) {
      this.backups = value.backups ?? []
      this.players = value.players
      this.createFromSpecificData(value.tournamentSpecific)
    } else {
      this.players = value
      this.createFromPlayers(value)
    }
  }

  /**
   * Method that implements a way of creating the tournament data using the parsed data object stored in the database
   * @param specific An object that will have a format dependant of each tournament
   */
  abstract createFromSpecificData (specific: any): void

  /**
   * Method that implements a way of creating the tournament from scratch, containing only the players that will be used.
   * @param players Info of all players. If the tournament is seeded, this expected to be starting from the lowest seed to the highest
   */
  abstract createFromPlayers (players: PlayerInfo[]): void

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
    const data: TournamentObject = {
      backups: withBackups ? this.backups : undefined,
      players: this.players,
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
      if (!Array.isArray(value)) {
        return false
      } else {
        if (!value.every(v => typeof (v) === 'string')) {
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
}
