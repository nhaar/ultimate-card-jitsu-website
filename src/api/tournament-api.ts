import express = require('express')
import { Request, Response } from 'express'
import { asyncWrapper } from '../utils/utils'
import User from '../database/user'
import Tournament, { PlayerInfo, TournamentPhase } from '../database/tournament'

const router = express.Router()

router.post('/create', User.checkAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { players }: { players: string[] } = req.body

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

  const playerInfo: PlayerInfo[] = []
  for (const player of players) {
    const user = await User.getUserByName(player)
    if (user === null) {
      res.status(400).json({ error: `user ${player} does not exist` })
      return
    }
    playerInfo.push({
      name: player,
      id: user.id
    })
  }

  await Tournament.createTournament(...playerInfo)

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
  const updateResult = await tournament.updateScore(matchIndex, standings)
  if (updateResult !== undefined) {
    res.status(400).json({ error: `invalid standings: ${updateResult}` })
    return
  }
  res.sendStatus(200)
}))

router.get('/tie', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const tournament: Tournament = await Tournament.getTournament()
  const ties = tournament.getTies()
  const containsTie = tournament.isWaitingToSettleTies()
  res.json({ exists: containsTie, ties }).status(200)
}))

router.get('/active', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const exists = await Tournament.tournamentExists()
  res.json({ active: exists }).status(200)
}))

router.get('/date', asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const date = await Tournament.getTournamentDate()
  res.json({ date }).status(200)
}))

router.post('/settle-tie', User.checkAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { points, winners }: { points: number, winners: number[] } = req.body
  if (typeof (points) !== 'number') {
    res.status(400).json({ error: 'points must be a number' })
    return
  }
  if (!Array.isArray(winners)) {
    res.status(400).json({ error: 'winners must be an array' })
    return
  }
  if (!winners.every((winner) => typeof (winner) === 'number')) {
    res.status(400).json({ error: 'winners must be an array of numbers' })
    return
  }

  const tournament: Tournament = await Tournament.getTournament()
  await tournament.settleTies({ [points]: winners })
  res.sendStatus(200)
}))

router.get('/players-info', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const tournament: Tournament = await Tournament.getTournament()
  res.json(tournament.getPlayerInfo()).status(200)
}))

router.post('/rollback', User.checkAdminMiddleware, asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const tournament = await Tournament.getTournament()
  await tournament.rollback()
  res.sendStatus(200)
}))

/** Helper function to create the response to asking for rankings of a phase */
const rankingResponse = (phase: TournamentPhase): ((req: Request, res: Response) => void) => {
  return asyncWrapper(async (_: Request, res: Response): Promise<void> => {
    const tournament = await Tournament.getTournament()
    const ranking = tournament.getRankings(phase)
    res.json(ranking).status(200)
  })
}

router.get('/start-rankings', rankingResponse(TournamentPhase.Start))

router.get('/final-rankings', rankingResponse(TournamentPhase.Final))

router.get('/current-phase', asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const tournament = await Tournament.getTournament()
  res.json({ phase: tournament.getCurrentPhase() }).status(200)
}))

router.get('/is-finished', asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const tournament = await Tournament.getTournament()
  res.json({ finished: tournament.isFinished }).status(200)
}))

export default router
