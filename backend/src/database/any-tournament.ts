import { isObject } from '../utils/utils'
import Database from './database'
import FireTournament from './fire-tournament'
import NormalTournament from './normal-tournament'
import Tournament, { FinalStandings, Matchup, TournamentType } from './tournament'

/** Class for a generic tournament. Performs actions for all tournament types. */
export default class AnyTournament extends Tournament {
  /** Data specific to this tournament. */
  specificData: any

  constructor (value: any) {
    super(value)
    if (Array.isArray(value)) {
      // it makes no sense to create a generic tournament to perform actions for no tournament
      throw new Error('Any Tournament can\' be used from scratch')
    } else {
      this.specificData = value.tournamentSpecific
    }
  }

  override isSpecificTournamentObject (tournamentSpecific: any): boolean {
    return true
  }

  override getSpecificData (): any {
    return this.specificData
  }

  /** Get the data of the tournament or `undefined` if none */
  private static async getTournamentData (): Promise<object | undefined> {
    const db = new Database()
    const query = await db.getQuery('SELECT * FROM tournament', [])
    if (query.rows.length === 0) {
      return undefined
    } else {
      const data = query.rows[0].data
      if (!isObject(data)) {
        return undefined
      }
      return data
    }
  }

  /** Gets the tournament that is currently ongoing, or `undefined` if no tournament. */
  static async getCurrent (): Promise<FireTournament | NormalTournament | undefined> {
    const data = await AnyTournament.getTournamentData()
    if (data === undefined || !('type' in data)) {
      return undefined
    }
    if (data.type === 'fire') {
      return new FireTournament(data)
    } else if (data.type === 'normal') {
      return new NormalTournament(data)
    } else {
      return undefined
    }
  }

  /** Get the tournament based on its type */
  private static async getTournamentOfType (type: TournamentType): Promise<FireTournament | NormalTournament | undefined> {
    const data = await AnyTournament.getTournamentData()
    if (data === undefined || !('type' in data) || data.type !== type) {
      return undefined
    } else {
      if (type === 'fire') {
        return new FireTournament(data)
      } else if (type === 'normal') {
        return new NormalTournament(data)
      } else {
        return undefined
      }
    }
  }

  /** Get a fire tournament instance or `undefined` if it doesn't exist */
  static async getFire (): Promise<FireTournament | undefined> {
    return await AnyTournament.getTournamentOfType('fire') as FireTournament | undefined  
  }

  /** Get a regulard card-jitsu tournament instance or `undefined` if it doesnt' exist */
  static async getNormal (): Promise<NormalTournament | undefined> {
    return await AnyTournament.getTournamentOfType('normal') as NormalTournament | undefined
  }

  /** Get an instance of a generic tournament, or `undefined` if no tournament exists. */
  static async getAny (): Promise<AnyTournament | undefined> {
    const data = await AnyTournament.getTournamentData()
    if (data === undefined) {
      return undefined
    }
    return new AnyTournament(data)
  }

  /** Rollback the tournament to the last backup in the database */
  async rollback (): Promise<void> {
    // last backup should be the current state, so discard it, and use the next one
    this.backups.shift()
    const backuptoUse = this.backups[0]

    // no backups, don't do anything
    if (backuptoUse === undefined) {
      return
    }

    const backedupTournament = JSON.parse(backuptoUse)
    backedupTournament.backups = [...this.backups]
    backedupTournament.players = this.players
    const newTournament = new AnyTournament(backedupTournament)

    // skip backup because it would be the same as the latest snapshot
    await newTournament.save(false)
  }

  override getFinalStandings (): FinalStandings {
    return []
  }
  
  override getMatchups (): Matchup[] {
    return []
  }
}
