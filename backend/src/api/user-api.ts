import express = require('express')
import { Request, Response } from 'express'

import User from '../database/user'
import { asyncWrapper, checkBotMiddleware, formatCookies } from '../utils/utils'
import FireTournament from '../database/fire-tournament'

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

      // do this because the given username might have wrong case
      const realUsername = await user.getUserName()
      res.json({ token, name: realUsername })
    } else {
      res.status(401).json({ error: 'incorrect password' })
    }
  } else {
    res.status(401).json({ error: 'user does not exist' })
  }
}))

router.post('/update-account', User.checkAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body

  if (typeof (username) !== 'string') {
    res.status(400).json({ error: 'username must be a string' })
    return
  }

  if (typeof (password) !== 'string') {
    res.status(400).json({ error: 'password must be a string' })
    return
  }

  // here we decide if we're creating an account or changing the password
  if ((await User.userExists(username))) {
    const user = await User.getUserByName(username)
    if (user === null) {
      throw new Error('Impossible user existing and not being found')
    }
    await user.changePassword(password)
  } else {
    await User.createUser(username, password)
  }

  res.sendStatus(200)
}))

router.get('/user-role', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
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
  if (await user.isCPIAdmin()) {
    res.status(200).json({ role: 'cpiadmin' })
    return
  }
  res.status(200).json({ role: 'user' })
}))

router.get('/all-players', User.checkCPIAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
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

router.post('/user-cpimagined-credentials', User.checkCPIAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { username } = req.body

  const user = await User.getUserByName(username)
  if (user === null) {
    res.sendStatus(400)
    return
  }

  const credentials = await user.getCPImaginedCredentials()
  res.json(credentials).status(200)
}))

router.get('/get-credentialess-users', User.checkCPIAdminMiddleware, asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const users = await User.getAllUsersWithoutCredentials()

  res.json(users).status(200)
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
      if (await FireTournament.tournamentExists()) {
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

router.post('/update-cpimagined-credentials', User.checkCPIAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { siteUsername, cpImaginedUsername, cpImaginedPassword } = req.body
  if (typeof (siteUsername) !== 'string') {
    res.status(400).json({ error: 'siteUsername must be a string' })
    return
  }
  const targetUser = await User.getUserByName(siteUsername)
  if (targetUser === null) {
    res.status(404).json({ error: 'user not found' })
    return
  }

  if (typeof (cpImaginedUsername) !== 'string') {
    res.status(400).json({ error: 'cpImaginedUsername must be a string' })
    return
  }
  if (typeof (cpImaginedPassword) !== 'string') {
    res.status(400).json({ error: 'cpImaginedPassword must be a string' })
    return
  }

  await targetUser.updateCPImaginedCredentials(cpImaginedUsername, cpImaginedPassword)
  res.sendStatus(200)
}))

router.post('/make-cpi-admin', User.checkAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { target } = req.body

  const targetUser = await User.getUserByName(target)
  if (targetUser === null) {
    res.sendStatus(400)
    return
  }

  // avoid "demoting"
  if (!(await targetUser.isRegularUser())) {
    res.sendStatus(401)
    return
  }

  await targetUser.makeCPIAdmin()
  res.sendStatus(200)
}))

router.post('/update-discord', User.checkAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { siteUsername, discordUsername } = req.body

  if (typeof (siteUsername) !== 'string' || typeof (discordUsername) !== 'string') {
    res.sendStatus(400)
    return
  }

  const user = await User.getUserByName(siteUsername)
  if (user === null) {
    res.sendStatus(400)
    return
  }

  await user.updateDiscord(discordUsername)
  res.sendStatus(200)
}))

router.post('/get-discord', User.checkAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { username } = req.body

  if (typeof (username) !== 'string') {
    res.sendStatus(400)
    return
  }
  const user = await User.getUserByName(username)
  if (user === null) {
    res.sendStatus(400)
    return
  }

  const discord = await user.getDiscord()
  res.status(200).send({ discord })
}))

router.get('/discordless-users', User.checkAdminMiddleware, asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const users = await User.getDiscordlessUsers()
  res.status(200).send({ users })
}))

router.get('/discord-names', checkBotMiddleware, asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const discord = await User.getAllDiscords()

  res.status(200).send(discord)
}))

router.get('/all-user-info', User.checkAdminMiddleware, asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const info = await User.getAllUserInfo()
  res.status(200).send(info)
}))

export default router
