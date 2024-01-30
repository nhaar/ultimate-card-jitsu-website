import express = require('express')
import { Request, Response } from 'express'

import User from '../database/user'
import { asyncWrapper, formatCookies } from '../utils/utils'

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

router.post('/edit', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { token, username, cpimaginedUser, cpimaginedPass, pronouns, pfp } = req.body

  if (typeof (token) !== 'string') {
    res.status(400).json({ error: 'token must be a string' })
    return
  }

  const user: User | null = await User.getUserByToken(token)
  if (user === null) {
    res.status(401).json({ error: 'invalid session token' })
    return
  }

  if (typeof (username) === 'string') {
    await user.updateColumn('username', username)
  }
  if (typeof (cpimaginedUser) === 'string') {
    await user.updateColumn('cpimagined_user', cpimaginedUser)
  }
  if (typeof (cpimaginedPass) === 'string') {
    await user.updateColumn('cpimagined_pass', cpimaginedPass)
  }
  if (typeof (pronouns) === 'string') {
    await user.updateColumn('pronouns', pronouns)
  }
  if (typeof (pfp) === 'string') {
    await user.updateColumn('pfp', pfp)
  }

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

export default router
