import crypto = require('crypto')

import { Request, Response, NextFunction } from 'express'
import bcrypt = require('bcrypt')

import Database from './database'
import { config } from '../config'
import { formatCookies } from '../utils/utils'

export default class User {
  db: Database
  id: number

  constructor (id: number) {
    this.db = new Database()
    this.id = id
  }

  static async generateToken (): Promise<string> {
    return crypto.randomBytes(256).toString('hex')
  }

  async startSession (): Promise<string> {
    const token = await User.generateToken()
    await this.updateColumn('token', token)
    return token
  }

  static async encryptPassword (password: string): Promise<string> {
    return await bcrypt.hash(password, config.SALT)
  }

  static async createUser (username: string, password: string): Promise<User> {
    const db = new Database()
    const query = await db.getQuery('INSERT INTO players (username, password) VALUES ($1, $2)', [username, await User.encryptPassword(password)])
    return new User(query.rows[0].id)
  }

  static async getUserByName (username: string): Promise<User | null> {
    const db = new Database()
    const res = await db.getQuery('SELECT * FROM players WHERE LOWER(username) = $1', [username.toLowerCase()])
    if (res.rows.length === 0) return null
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

  static checkAdminMiddleware (req: Request, res: Response, next: NextFunction): void {
    void (async (req: Request, res: Response, next: NextFunction) => {
      const cookies = req.headers.cookies
      if (typeof (cookies) !== 'string') {
        res.status(401).json({ error: 'missing session token' })
        return
      }
      const { token } = formatCookies(cookies)
      if (typeof (token) !== 'string') {
        res.status(400).json({ error: 'session token must be a string' })
        return
      }
      const creator: User | null = await User.getUserByToken(token)
      if (creator === null) {
        res.status(401).json({ error: 'invalid session token' })
        return
      }
      if (!(await creator.isAdmin())) {
        res.status(401).json({ error: 'user is not an admin' })
        return
      }
      next()
    })(req, res, next)
  }

  /**
   * Get a list of all username of users in the database
   * @returns
   */
  static async getAllUsers (): Promise<string[]> {
    const db = new Database()
    const res = await db.getQuery('SELECT username FROM players', [])
    return res.rows.map((row: { username: string }) => row.username)
  }

  /**
   * Get an object with credentials of the CP Imagined account associated
   */
  async getCPImaginedCredentials (): Promise<{ username: string, password: string }> {
    const res = await this.db.getQuery('SELECT cpimagined_user, cpimagined_pass FROM players WHERE id = $1', [this.id])
    console.log(res)
    return { username: res.rows[0].cpimagined_user, password: res.rows[0].cpimagined_pass }
  }

  /** Get the profile picture, which is stored as a URL source. */
  async getPFP (): Promise<string> {
    const res = await this.db.getQuery('SELECT pfp FROM players WHERE id = $1', [this.id])
    return res.rows[0].pfp
  }

  /** Get the username */
  async getUserName (): Promise<string> {
    const res = await this.db.getQuery('SELECT username FROM players WHERE id = $1', [this.id])
    return res.rows[0].username
  }

  /** Get the pronouns */
  async getPronouns (): Promise<string> {
    const res = await this.db.getQuery('SELECT pronouns FROM players WHERE id = $1', [this.id])
    return res.rows[0].pronouns
  }

  /** Check if the given name is being used by another player, case insensitive */
  async isNameAvailable (username: string): Promise<boolean> {
    const currentName = await this.getUserName()

    // allowing users to change case
    if (username.toLowerCase() === currentName.toLowerCase()) return true

    const res = await this.db.getQuery('SELECT * FROM players WHERE LOWER(username) = LOWER($1)', [username])
    return res.rows.length === 0
  }
}
