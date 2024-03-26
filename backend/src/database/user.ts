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

  /** Used to create the admin account if it doesn't exist. */
  static async createAdmin (): Promise<void> {
    const admin = await User.getUserByName(config.ADMIN_NAME)
    if (admin !== null) return

    const adminUser = await User.createUser(config.ADMIN_NAME, config.ADMIN_PASSWORD)
    await adminUser.makeAdmin()
  }

  /** Make this user an admin */
  async makeAdmin (): Promise<void> {
    await this.updateColumn('is_admin', 1)
  }

  /** Make the user a CPI admin (which has a few admin permissions) */
  async makeCPIAdmin (): Promise<void> {
    await this.updateColumn('is_admin', 2)
  }

  /** Creates an user with the given name and password and returns it. */
  static async createUser (username: string, password: string): Promise<User> {
    const db = new Database()
    await db.getQuery('INSERT INTO players (username, password) VALUES ($1, $2)', [username, await User.encryptPassword(password)])
    const maxId = await db.getQuery('SELECT MAX(id) FROM players', [])
    return new User(maxId.rows[0].max)
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

  /** Check if a user exists by its name (name is case insensitive) */
  static async userExists (username: string): Promise<boolean> {
    const db = new Database()
    const res = await db.getQuery('SELECT * FROM players WHERE LOWER(username) = $1', [username.toLowerCase()])
    return res.rows.length > 0
  }

  /** Check whether or not a password is correct for a given username (name is case insensitive) */
  static async checkPassword (username: string, password: string): Promise<boolean> {
    const db = new Database()
    const hash = (await db.getQuery('SELECT password FROM players WHERE LOWER(username) = $1', [username.toLowerCase()])).rows[0].password
    return await bcrypt.compare(password, hash)
  }

  /** Check if a user is a regular user (no type of admin) */
  async isRegularUser (): Promise<boolean> {
    const res = await this.db.getQuery('SELECT is_admin FROM players WHERE id = $1', [this.id])
    return res.rows[0].is_admin === 0
  }

  /** Check if a user is a regular admin (all permissions) */
  async isAdmin (): Promise<boolean> {
    const res = await this.db.getQuery('SELECT is_admin FROM players WHERE id = $1', [this.id])
    return res.rows[0].is_admin === 1
  }

  /** Check if a user is a CPI admin (some permissions) */
  async isCPIAdmin (): Promise<boolean> {
    const res = await this.db.getQuery('SELECT is_admin FROM players WHERE id = $1', [this.id])

    return res.rows[0].is_admin === 2
  }

  async updateColumn (column: string, value: any): Promise<void> {
    await this.db.getQuery(`UPDATE players SET ${column} = $1 WHERE id = $2`, [value, this.id])
  }

  /** Base method to be used to create a middleware that checks if the user has any sort of admin roles */
  private static checkAdminRoleMiddleware (req: Request, res: Response, next: NextFunction, strictAdmin: boolean): void {
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

      const isAdmin = await creator.isAdmin()
      const hasEnoughAdminPerms = (
        (strictAdmin && (isAdmin)) ||
        (!strictAdmin && (isAdmin || (await creator.isCPIAdmin())))
      )
      if (!hasEnoughAdminPerms) {
        res.status(401).json({ error: 'user does not have admin perms' })
        return
      }
      next()
    })(req, res, next)
  }

  /** Middleware that only allows regular admins to use the endpoint */
  static checkAdminMiddleware (req: Request, res: Response, next: NextFunction): void {
    User.checkAdminRoleMiddleware(req, res, next, true)
  }

  /** Middleware that only allows CPI admins or regular admins to use the endpoint */
  static checkCPIAdminMiddleware (req: Request, res: Response, next: NextFunction): void {
    User.checkAdminRoleMiddleware(req, res, next, false)
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

  /** Update the CPImagined credentials for the user */
  async updateCPImaginedCredentials (username: string, password: string): Promise<void> {
    await this.updateColumn('cpimagined_user', username)
    await this.updateColumn('cpimagined_pass', password)
  }

  /** Changes the user's password to a new one */
  async changePassword (newPassword: string): Promise<void> {
    await this.updateColumn('password', await User.encryptPassword(newPassword))
  }

  /** Get an array with all the username of accounts that don't have proper CPImagned credentials */
  static async getAllUsersWithoutCredentials (): Promise<string[]> {
    const db = new Database()
    const res = await db.getQuery('SELECT username FROM players WHERE cpimagined_user IS NULL OR cpimagined_user = \'\' OR cpimagined_pass IS NULL OR cpimagined_pass = \'\'', [])
    return res.rows.map((row: any) => row.username)
  }

  /** Update this user's discord username */
  async updateDiscord (discord: string): Promise<void> {
    await this.updateColumn('discord', discord)
  }

  /** Get this user's discord username */
  async getDiscord (): Promise<string> {
    const res = await this.db.getQuery('SELECT discord FROM players WHERE id = $1', [this.id])
    return res.rows[0].discord ?? ''
  }

  /** Get a list of all users with no discord in their account (list of username) */
  static async getDiscordlessUsers (): Promise<string[]> {
    const db = new Database()
    const res = await db.getQuery('SELECT username FROM players WHERE discord IS NULL OR discord = \'\'', [])
    return res.rows.map((row: any) => row.username)
  }

  /** Get a object that maps user ID to their respective discord number */
  static async getAllDiscords (): Promise<{[key: number]: string}> {
    const db = new Database()
    const res = await db.getQuery('SELECT id, discord FROM players WHERE discord IS NOT NULL AND discord != \'\'', [])
    const map: {[key: number]: string} = {}
    for (const row of res.rows) {
      map[row.id] = row.discord
    }

    return map
  }
}
