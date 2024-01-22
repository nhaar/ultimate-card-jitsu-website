import pg = require('pg')

import { config } from '../config.js'

export default class Database {
  pool: pg.Pool

  constructor () {
    this.pool = new pg.Pool({
      user: config.PG_USER,
      database: config.PG_DATABASE,
      password: config.PG_PASSWORD,
      host: config.PG_HOST,
      port: config.PG_PORT
    })
  }

  initTables (): void {
    void this.pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        cpimagined_user TEXT,
        cpimaginer_pass TEXT,
        pronouns TEXT,
        pfp TEXT,
        is_admin INTEGER NOT NULL DEFAULT 0,
        token TEXT
      );
    `)

    void this.pool.query(`
      CREATE TABLE IF NOT EXISTS tournament (
        data JSONB
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
