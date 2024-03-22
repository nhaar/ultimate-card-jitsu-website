import express = require('express')
import { Request, Response } from 'express'
import { asyncWrapper, isStringNumber } from '../utils/utils'
import User from '../database/user'
import Tournament, { PlayerInfo } from '../database/tournament'
import FireTournament, { TournamentPhase } from '../database/fire-tournament'
import NormalTournament from '../database/normal-tournament'
import AnyTournament from '../database/any-tournament'

const router = express.Router()

/**
 * Get a function that can be used as a base endpoint response for creating a tournament
 * @param minimumPlayers Minimum number of players allowed in tournament
 * @param createCallback Function that takes the array of player info and creates the tournament in the database
 * @returns The function that can be used
 */
function getCreateTournamentResponse (minimumPlayers: number, createCallback: (...playerInfo: PlayerInfo[]) => Promise<void>): ((req: Request, res: Response) => void) {
  return asyncWrapper(async (req: Request, res: Response): Promise<void> => {
    const { players }: { players: string[] } = req.body

    if (!Array.isArray(players)) {
      res.status(400).json({ error: 'players must be an array' })
      return
    }
    if (!players.every((player) => typeof (player) === 'string')) {
      res.status(400).json({ error: 'players must be an array of strings' })
      return
    }
    if (players.length < minimumPlayers) {
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

    await createCallback(...playerInfo)

    res.sendStatus(200)
  })
}

router.post('/create-fire', User.checkAdminMiddleware, getCreateTournamentResponse(4, async (...playerInfo: PlayerInfo[]): Promise<void> => {
  await FireTournament.createTournament(playerInfo)
}))

router.post('/create-normal', User.checkAdminMiddleware, getCreateTournamentResponse(4, async (...playerInfo: PlayerInfo[]): Promise<void> => {
  await NormalTournament.createTournament(playerInfo)
}))

router.get('/matches', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const tournament = await FireTournament.getTournament()
  if (tournament === undefined) {
    res.sendStatus(400)
    return
  }
  res.json(tournament.getMatches()).status(200)
}))

router.get('/normal-tournament', asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const tournament = await NormalTournament.getTournament()
  if (tournament === undefined) {
    res.sendStatus(400)
    return
  }

  res.json(tournament.getMatches()).status(200)
}))

router.post('/update-normal-score', User.checkAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { matchNumber, leftScore, rightScore } = req.body

  const tournament = await NormalTournament.getTournament()
  if (tournament === undefined) {
    res.sendStatus(400)
    return
  }

  await tournament.decideMatch(matchNumber, leftScore, rightScore)
  res.sendStatus(200)
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

  const tournament = await FireTournament.getTournament()
  if (tournament === undefined) {
    res.sendStatus(400)
    return
  }

  const updateResult = await tournament.updateScore(matchIndex, standings)
  if (updateResult !== undefined) {
    res.status(400).json({ error: `invalid standings: ${updateResult}` })
    return
  }
  res.sendStatus(200)
}))

router.get('/tie', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const tournament = await FireTournament.getTournament()
  if (tournament === undefined) {
    res.sendStatus(400)
    return
  }

  const ties = tournament.getTies()
  const containsTie = tournament.isWaitingToSettleTies()
  res.json({ exists: containsTie, ties }).status(200)
}))

router.get('/active', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const exists = await FireTournament.tournamentExists()
  res.json({ active: exists }).status(200)
}))

router.get('/date', asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const date = await FireTournament.getTournamentDate()
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

  const tournament = await FireTournament.getTournament()
  if (tournament === undefined) {
    res.sendStatus(400)
    return
  }

  await tournament.settleTies({ [points]: winners })
  res.sendStatus(200)
}))

router.get('/players-info', asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const tournament = await AnyTournament.get()
  if (tournament === undefined) {
    res.sendStatus(400)
    return
  }

  res.json(tournament.getPlayerInfo()).status(200)
}))

router.post('/rollback', User.checkAdminMiddleware, asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const tournament = await AnyTournament.get()
  if (tournament === undefined) {
    res.sendStatus(400)
    return
  }

  await tournament.rollback()
  res.sendStatus(200)
}))

/** Helper function to create the response to asking for rankings of a phase */
const rankingResponse = (phase: TournamentPhase): ((req: Request, res: Response) => void) => {
  return asyncWrapper(async (_: Request, res: Response): Promise<void> => {
    const tournament = await FireTournament.getTournament()
    if (tournament === undefined) {
      res.sendStatus(400)
      return
    }

    const ranking = tournament.getRankings(phase)
    res.json(ranking).status(200)
  })
}

router.get('/start-rankings', rankingResponse(TournamentPhase.Start))

router.get('/final-rankings', rankingResponse(TournamentPhase.Final))

router.get('/current-phase', asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const tournament = await FireTournament.getTournament()
  if (tournament === undefined) {
    res.sendStatus(400)
    return
  }

  res.json({ phase: tournament.getCurrentPhase() }).status(200)
}))

router.get('/is-finished', asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const tournament = await AnyTournament.get()
  if (tournament === undefined) {
    res.sendStatus(400)
    return
  }

  res.json({ finished: tournament.isFinished }).status(200)
}))

router.post('/delete', User.checkAdminMiddleware, asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  await FireTournament.deleteTournament()
  res.sendStatus(200)
}))

router.post('/set-date', User.checkAdminMiddleware, asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { date }: { date: string } = req.body
  if (typeof (date) !== 'string') {
    res.status(400).json({ error: 'date must be a string' })
    return
  }
  if (!isStringNumber(date)) {
    res.status(400).json({ error: 'date must be a number' })
    return
  }
  await FireTournament.setTournamentDate(date)
  res.sendStatus(200)
}))

router.post('/reset-date', User.checkAdminMiddleware, asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  await FireTournament.removeTournamentDate()
  res.sendStatus(200)
}))

router.get('/get-display-phase', asyncWrapper(async (_: Request, res: Response): Promise<void> => {
  const tournament = await FireTournament.getTournament()

  if (tournament === undefined) {
    res.status(200).send({
      phase: 'NOT STARTED'
    })
    return
  }

  const currentPhase = tournament.getDisplayPhase()
  res.status(200).send({
    phase: currentPhase
  })
}))

/**
 * Get a function that gets a function useable as a response to getting the final standings of a tournament
 * @param tournamentGetter Asynchronous function that must return the tournament or `undefined`
 * @returns Function for use in endpoint
 */
function getStandingsGetter (tournamentGetter: () => Promise<Tournament | undefined>): (req: Request, res: Response) => void {
  return asyncWrapper(async (_: Request, res: Response): Promise<void> => {
    const tournament = await tournamentGetter()

    if (tournament === undefined) {
      res.sendStatus(400)
      return
    }

    const standings = tournament.getFinalStandings()
    if (standings === undefined) {
      res.sendStatus(400)
    } else {
      res.status(200).send({ standings })
    }
  })
}

router.get('/final-standings-fire', getStandingsGetter(async () => {
  return await FireTournament.getTournament()
}))

router.get('/final-standings-normal', getStandingsGetter(async () => {
  return await NormalTournament.getTournament()
}))

export default router
