import Database from './database'

/** Data representing battle info */
interface BattleInfoData {
  player1: string
  player2: string
}

/** Helper class that handles updating the current battle's player information in a tournament of UCJ. */
export default class BattleInfo {
  private readonly _db: Database

  constructor () {
    this._db = new Database()
  }

  private async rowExists (): Promise<boolean> {
    return (await this._db.getQuery('SELECT * FROM obs_battle_info', [])).rows.length !== 0
  }

  async writeInfo (player1: string, player2: string): Promise<void> {
    if (await this.rowExists()) {
      await this._db.getQuery('UPDATE obs_battle_info SET player1 = $1, player2 = $2', [player1, player2])
    } else {
      await this._db.getQuery('INSERT INTO obs_battle_info (player1, player2) VALUES ($1, $2)', [player1, player2])
    }
  }

  async readInfo (): Promise<BattleInfoData | undefined> {
    const row = (await this._db.getQuery('SELECT * FROM obs_battle_info', [])).rows[0]
    if (row === undefined) {
      return undefined
    }
    return {
      player1: row.player1,
      player2: row.player2
    }
  }
}
