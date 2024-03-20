import Database from './database'
import Tournament from './tournament'

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

  /** Get an instance of a generic tournament, or `undefined` if no tournament exists. */
  static async get (): Promise<AnyTournament | undefined> {
    const db = new Database()
    const query = await db.getQuery('SELECT * FROM tournament', [])
    if (query.rows.length === 0) {
      return undefined
    } else {
      return new AnyTournament(query.rows[0].data)
    }
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
}
