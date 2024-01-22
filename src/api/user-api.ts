import express = require('express')
import { Request, Response } from 'express'

import User from '../database/user'
import { asyncWrapper } from '../utils/utils'

const router = express.Router()

router.use('/login', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
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
      res.json({ success: true })
    } else {
      res.status(401).json({ error: 'incorrect password' })
    }
  } else {
    res.status(401).json({ error: 'user does not exist' })
  }
}))

router.use('/register', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
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

router.use('/edit', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
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

export default router
