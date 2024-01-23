import express = require('express')
import { Request, Response } from 'express'
import { asyncWrapper } from '../utils/utils'
import User from '../database/user'
import Tournament from '../database/tournament'

const router = express.Router()

router.post('/create', User.checkAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { players }: { token: string, players: string[] } = req.body

  if (!Array.isArray(players)) {
    res.status(400).json({ error: 'players must be an array' })
    return
  }
  if (!players.every((player) => typeof (player) === 'string')) {
    res.status(400).json({ error: 'players must be an array of strings' })
    return
  }
  if (players.length < 4) {
    res.status(400).json({ error: 'not enough players' })
    return
  }

  const playerIds = []
  for (const player of players) {
    const user = await User.getUserByName(player)
    if (user === null) {
      res.status(400).json({ error: `user ${player} does not exist` })
      return
    }
    playerIds.push(user.id)
  }

  await Tournament.createTournament(...playerIds)

  res.sendStatus(200)
}))

router.get('/matches', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const tournament: Tournament = await Tournament.getTournament()
  res.json(tournament.getMatches()).status(200)
}))

router.post('/update-score', User.checkAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { matchIndex, standings }: { matchIndex: number, standings: number[] } = req.body

  if (typeof (matchIndex) !== 'number') {
    res.status(400).json({ error: 'matchIndex must be a number' })
    return
  }

  if (!Array.isArray(standings)) {
    res.status(400).json({ error: 'standings must be an array' })
    return
  }
  if (!standings.every((standing) => typeof (standing) === 'number')) {
    res.status(400).json({ error: 'standings must be an array of numbers' })
    return
  }

  const tournament: Tournament = await Tournament.getTournament()
  const updateResult = tournament.updateScore(matchIndex, standings)
  if (updateResult !== undefined) {
    res.status(400).json({ error: `invalid standings: ${updateResult}` })
    return
  }
  res.sendStatus(200)
}))

router.get('/standings', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const tournament: Tournament = await Tournament.getTournament()
  res.json(tournament.getPlayerPoints()).status(200)
}))

router.get('/tie', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const tournament: Tournament = await Tournament.getTournament()
  const ties = tournament.getTies()
  const containsTie = tournament.containsTie()
  res.json({ exists: containsTie, ties }).status(200)
}))

router.get('/active', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const exists = await Tournament.tournamentExists()
  res.json({ active: exists }).status(200)
}))

router.get('/date', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const date = await Tournament.getTournamentDate()
  res.json({ date }).status(200)
}))

export default router
