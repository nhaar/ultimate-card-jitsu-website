import express = require('express')
import { Request, Response } from 'express'

import User from '../database/user'
import { asyncWrapper, formatCookies } from '../utils/utils'
import Tournament from '../database/tournament'

const router = express.Router()

router.post('/login', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body

  if (typeof (username) !== 'string') {
    res.status(400).json({ error: 'username must be a string' })
    return
  }
  if (typeof (password) !== 'string') {
    res.status(400).json({ error: 'password must be a string' })
    return
  }
  if (await User.userExists(username)) {
    if (await User.checkPassword(username, password)) {
      const user = await User.getUserByName(username) as User
      const token = await user.startSession()
      res.json({ token, name: username })
    } else {
      res.status(401).json({ error: 'incorrect password' })
    }
  } else {
    res.status(401).json({ error: 'user does not exist' })
  }
}))

router.post('/register', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { username, password, creatorToken } = req.body

  if ((await User.userExists(username))) {
    res.status(400).json({ error: 'user already exists' })
    return
  }

  if (typeof (creatorToken) !== 'string') {
    res.status(400).json({ error: 'session token must be a string' })
    return
  }

  const creator: User | null = await User.getUserByToken(creatorToken)
  if (creator === null) {
    res.status(401).json({ error: 'invalid session token' })
    return
  }

  if (!(await creator.isAdmin())) {
    res.status(401).json({ error: 'user is not an admin' })
    return
  }

  if (typeof (username) !== 'string') {
    res.status(400).json({ error: 'username must be a string' })
    return
  }

  if (typeof (password) !== 'string') {
    res.status(400).json({ error: 'password must be a string' })
    return
  }

  await User.createUser(username, password)

  res.sendStatus(200)
}))

router.post('/user-role', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  if (req.headers.cookies === undefined) {
    res.status(400).json({ error: 'no cookies' })
    return
  }
  const { token } = formatCookies(req.headers.cookies as string)
  if (typeof (token) !== 'string') {
    res.status(200).json({ role: 'none' })
    return
  }
  const user: User | null = await User.getUserByToken(token)
  if (user === null) {
    res.status(200).json({ role: 'none' })
    return
  }
  if (await user.isAdmin()) {
    res.status(200).json({ role: 'admin' })
    return
  }
  res.status(200).json({ role: 'user' })
}))

router.get('/all-players', User.checkAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const users = await User.getAllUsers()
  res.json(users).status(200)
}))

/**
 * Get a function that can be used to respond to a user request that wants to do something to the users account.
 * @param callback The function that will do something with the user's account. The first argument is the object of the user, the second is the response object, and the third is the request object (optional).
 * @returns Function that should be used in a route.
 */
function replyWithUser (callback: (user: User, res: Response, req: Request) => Promise<void>): (req: Request, res: Response) => void {
  const replyFunction = (req: Request, res: Response): void => {
    void (async () => {
      if (typeof (req.headers.cookies) !== 'string') {
        res.status(400).json({ error: 'no cookies' })
        return
      }
      const { token } = formatCookies(req.headers.cookies)
      if (typeof (token) !== 'string') {
        res.status(401).json({ error: 'invalid session token' })
        return
      }
      const user = await User.getUserByToken(token)
      if (user === null) {
        res.status(401).json({ error: 'invalid session token' })
        return
      }
      void callback(user, res, req)
    })()
  }
  return replyFunction
}

router.get('/cpimagined-credentials', replyWithUser(async (user: User, res: Response): Promise<void> => {
  const credentials = await user.getCPImaginedCredentials()
  res.json(credentials).status(200)
}))

router.get('/account-info', replyWithUser(async (user: User, res: Response): Promise<void> => {
  res.json({
    pronouns: await user.getPronouns(),
    pfp: await user.getPFP()
  }).status(200)
}))

router.post('/edit', replyWithUser(async (user: User, res: Response, req: Request): Promise<void> => {
  const { username, pronouns, pfp } = req.body

  if (typeof (username) === 'string') {
    const previousName = await user.getUserName()
    if (username !== previousName) {
      if (await Tournament.tournamentExists()) {
        res.status(418).json({ error: 'tournament in progress' })
        return
      } else if (await user.isNameAvailable(username)) {
        await user.updateColumn('username', username)
      } else {
        res.status(409).json({ error: 'taken' })
        return
      }
    }
  }
  if (typeof (pronouns) === 'string') {
    await user.updateColumn('pronouns', pronouns)
  }
  if (typeof (pfp) === 'string') {
    await user.updateColumn('pfp', pfp)
  }
  res.sendStatus(200)
}))

export default router
