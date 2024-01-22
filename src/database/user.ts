import bcrypt = require('bcrypt')

import Database from './database'
import { config } from '../config'

export default class User {
  db: Database
  id: number

  constructor (id: number) {
    this.db = new Database()
    this.id = id
  }

  static async encryptPassword (password: string): Promise<string> {
    return await bcrypt.hash(password, config.SALT)
  }

  static async createUser (username: string, password: string): Promise<User> {
    const db = new Database()
    const query = await db.getQuery('INSERT INTO players (username, password) VALUES ($1, $2)', [username, await User.encryptPassword(password)])
    return new User(query.rows[0].id)
  }

  static async getUserByName (username: string): Promise<User> {
    const db = new Database()
    const res = await db.getQuery('SELECT * FROM players WHERE username = $1', [username])
    if (res.rows.length === 0) throw new Error('user not found')
    return new User(res.rows[0].id)
  }

  static async getUserByToken (token: string): Promise<User | null> {
    const db = new Database()
    const res = await db.getQuery('SELECT * FROM players WHERE token = $1', [token])
    if (res.rows.length === 0) return null
    return new User(res.rows[0].id)
  }

  static async userExists (username: string): Promise<boolean> {
    const db = new Database()
    const res = await db.getQuery('SELECT * FROM players WHERE username = $1', [username])
    return res.rows.length > 0
  }

  static async checkPassword (username: string, password: string): Promise<boolean> {
    const db = new Database()
    const hash = (await db.getQuery('SELECT password FROM players WHERE username = $1', [username])).rows[0].password
    return await bcrypt.compare(password, hash)
  }

  async isAdmin (): Promise<boolean> {
    const res = await this.db.getQuery('SELECT is_admin FROM players WHERE id = $1', [this.id])
    return Boolean(res.rows[0].is_admin)
  }

  async updateColumn (column: string, value: any): Promise<void> {
    await this.db.getQuery(`UPDATE players SET ${column} = $1 WHERE id = $2`, [value, this.id])
  }
}
