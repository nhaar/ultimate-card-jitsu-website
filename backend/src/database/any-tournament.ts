import { isObject } from '../utils/utils'
import Database from './database'
import FireTournament from './fire-tournament'
import { DoubleEliminationTournament, SingleEliminationTournament } from './normal-tournament'
import Tournament, { FinalStandings, Matchup, PlayerInfo, TournamentType } from './tournament'

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
      // get whatever type is in here, needed to serialize
      this.type = value.type
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
  static async getCurrent (): Promise<FireTournament | DoubleEliminationTournament | SingleEliminationTournament | undefined> {
    return await AnyTournament.getTournamentOfType()
  }

  /** Get the tournament based on its type, or leave blank to get whichever type it is */
  private static async getTournamentOfType (type?: TournamentType): Promise<FireTournament | DoubleEliminationTournament | SingleEliminationTournament | undefined> {
    const data = await AnyTournament.getTournamentData()
    if (data === undefined || !('type' in data)) {
      return undefined
    } else {
      const targetType = type ?? data.type
      if (data.type !== targetType) {
        return undefined
      } else if (targetType === 'fire') {
        return new FireTournament(data)
      } else if (targetType === 'double-elimination') {
        return new DoubleEliminationTournament(data)
      } else if (targetType === 'single-elimination') {
        return new SingleEliminationTournament(data)
      } else {
        return undefined
      }
    }
  }

  /** Get a fire tournament instance or `undefined` if it doesn't exist */
  static async getFire (): Promise<FireTournament | undefined> {
    return await AnyTournament.getTournamentOfType('fire') as FireTournament | undefined
  }

  /** Get a elimination tournament, which can be both a double or single elimination one, or `undefined` if it's not available */
  static async getNormal (): Promise<DoubleEliminationTournament | SingleEliminationTournament | undefined> {
    const double = await AnyTournament.getDoubleElimination()
    if (double === undefined) {
      return await AnyTournament.getSingleElimination()
    } else {
      return double
    }
  }

  /** Get a single elimination tournament or `undefined` if it's not available */
  static async getSingleElimination (): Promise<SingleEliminationTournament | undefined> {
    return await AnyTournament.getTournamentOfType('single-elimination') as SingleEliminationTournament | undefined
  }

  /** Get a double elimination tournament instance or `undefined` if it doesnt' exist */
  static async getDoubleElimination (): Promise<DoubleEliminationTournament | undefined> {
    return await AnyTournament.getTournamentOfType('double-elimination') as DoubleEliminationTournament | undefined
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

  /**
   * Create a tournament and returns it
   * @param type 
   * @param players 
   * @returns `undefined` if was not able to create it (invalid type)
   */
  static async createTournament (type: TournamentType, players: PlayerInfo[]): Promise<FireTournament | DoubleEliminationTournament | SingleEliminationTournament | undefined> {
    let tournament
    if (type === 'fire') {
      tournament = new FireTournament(players)
    } else if (type === 'double-elimination') {
      tournament = new DoubleEliminationTournament(players)
    } else if (type === 'single-elimination') {
      tournament = new SingleEliminationTournament(players)
    } else {
      return undefined
    }

    await tournament.save()
    return tournament
  }
}
