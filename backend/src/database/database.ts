import pg = require('pg')

import { config } from '../config'

export default class Database {
  pool: pg.Pool

  constructor () {
    this.pool = new pg.Pool({
      user: config.PG_USER,
      database: config.PG_DATABASE,
      password: config.PG_PASSWORD,
      port: config.PG_PORT
    })
  }

  /** Name of user table */
  static readonly USER_TABLE = 'players'

  async initTables (): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${Database.USER_TABLE} (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        cpimagined_user TEXT,
        cpimagined_pass TEXT,
        pronouns TEXT,
        pfp TEXT,
        is_admin INTEGER NOT NULL DEFAULT 0,
        token TEXT
      );
    `)

    await this.pool.query(`
      ALTER TABLE ${Database.USER_TABLE}
      ADD COLUMN IF NOT EXISTS discord TEXT
    `)

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tournament (
        data JSONB
      );
    `)

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tournament_date (
        date TEXT
      );
    `)
  }

  async getQuery (query: string, values: any[]): Promise<any> {
    return await new Promise((resolve, reject) => {
      this.pool.query(query, values, (err, res) => {
        if (err !== undefined) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  }
}
