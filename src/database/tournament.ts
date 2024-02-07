import Database from './database'

interface PlayerPoints {
  [key: number]: number
}

interface PlayerStandings {
  runnerId: number
  firsts: number
  seconds: number
  thirds: number
  fourths: number
}

interface Match {
  runners: number[]

  // this array organizes the runners in the order they finished using the "runner index",
  // eg [2, 0, 1, 3] means index 2 of runners finished first, and so forth
  standings: number[]
}

interface TournamentPhaseData {
  players: PlayerStandings[]
  matches: Match[]
}

interface Bracket {
  start: TournamentPhaseData
  final: TournamentPhaseData
}

/** Maps points to all players with the same points. Used for ties. */
interface PointMapping {
  [key: number]: number[]
}

/** Tied players in each of the phases */
interface TieStandings {
  /** First phase */
  first: PointMapping
  /** Final phase */
  final: PointMapping
}

/**
 * All the possible phases of the tournament
 */
export enum TournamentPhase {
  /** Starting phase, with all players */
  Start,
  /** Final phase where finalists play matches */
  Final
}

class Tournament {
  bracket: Bracket

  static readonly FIRST_PLACE_POINTS = 4
  static readonly SECOND_PLACE_POINTS = 3
  static readonly THIRD_PLACE_POINTS = 1
  static readonly FOURTH_PLACE_POINTS = 0
  static readonly FINAL_MATCHES = 3

  /** All ties in this tournament */
  tieStandings: TieStandings = {
    first: {},
    final: {}
  }

  /** Whether or not this tournament is finished */
  isFinished: boolean = false

  constructor (...args: any[]) {
    if (args.length === 0) {
      throw new Error('no arguments provided')
    }
    if (args.length === 1 && Tournament.isBracket(args[0].bracket)) {
      this.bracket = args[0].bracket
    } else {
      const start: PlayerStandings[] = []
      for (const runner of args) {
        start.push({
          runnerId: runner,
          firsts: 0,
          seconds: 0,
          thirds: 0,
          fourths: 0
        })
      }
      this.bracket = {
        start: {
          players: start,
          matches: Tournament.generateMatches(args)
        },
        final: {
          players: [],
          matches: []
        }
      }
    }
  }

  /**
   * Generates all the matches for the first phase of the tournament
   */
  static generateMatches (runners: number[]): Match[] {
    const matches: Match[] = []

    // use these sets so that we generate the matches using every player and then once it's done we restart, creating a loop
    // the loop is done enough times so that it's guaranteed to generate the matches we watned
    let untakenPlayers = new Set<number>()
    let takenPlayers = new Set<number>()

    const resetTakenPlayers = (): void => {
      untakenPlayers = new Set(runners)
      takenPlayers = new Set<number>()
    }

    // forbidden players are ones in the same match, must be used to avoid duplicates in same match
    const getRandomPlayer = (forbiddenPlayers: Set<number>): number => {
      // to act as a "looping" mechanism while generating matches, meaning we are readding players to the poll
      if (untakenPlayers.size === 0) {
        resetTakenPlayers()
      }

      // allowed is the difference of untaken and forbidden
      const allowed = new Set<number>()
      for (const player of untakenPlayers) {
        if (!forbiddenPlayers.has(player)) {
          allowed.add(player)
        }
      }
      const randomIndex = Math.floor(Math.random() * allowed.size)

      return Array.from(allowed)[randomIndex]
    }

    resetTakenPlayers()

    // randomly build matches, with the same number of matches as the number of runners
    // we can guarantee we will be able to close the bracket this way with everyone playing
    // the same number of times
    for (let i = 0; i < runners.length; i++) {
      const newMatch: Match = {
        runners: [],
        standings: []
      }
      const playersInMatch = new Set<number>()
      while (newMatch.runners.length < 4) {
        const player = getRandomPlayer(playersInMatch)
        newMatch.runners.push(player)
        untakenPlayers.delete(player)
        takenPlayers.add(player)
        playersInMatch.add(player)
      }
      matches.push(newMatch)
    }

    return matches
  }

  static isPlayerStandings (obj: any): obj is PlayerStandings {
    if (typeof (obj) !== 'object' || obj === null || Array.isArray(obj)) {
      return false
    }

    const numbers = ['runnerId', 'firsts', 'seconds', 'thirds', 'fourths']
    for (const number of numbers) {
      if (obj[number] === undefined || typeof (obj[number]) !== 'number') {
        return false
      }
    }
    return true
  }

  static isMatch (obj: any): obj is Match {
    if (typeof (obj) !== 'object' || obj === null || Array.isArray(obj)) {
      return false
    }

    if (!Array.isArray(obj.runners) || obj.runners.every((x: any) => typeof (x) === 'number') === false || obj.runners.length !== 4) {
      return false
    }
    if (!Array.isArray(obj.standings) || obj.standings.every((x: any) => typeof (x) === 'number') === false || (obj.standings.length !== 4 && obj.standings.length !== 0)) {
      return false
    }
    return true
  }

  static isTournamentPhase (obj: any): obj is TournamentPhaseData {
    if (typeof (obj) !== 'object' || obj === null || Array.isArray(obj)) {
      return false
    }
    if (!Array.isArray(obj.players) || obj.players.every(Tournament.isPlayerStandings) === false) {
      return false
    }
    if (!Array.isArray(obj.matches) || obj.matches.every(Tournament.isMatch) === false) {
      return false
    }
    return true
  }

  static isBracket (obj: any): obj is Bracket {
    if (typeof (obj) !== 'object' || obj === null || Array.isArray(obj)) {
      return false
    }
    if (!Tournament.isTournamentPhase(obj.start) || !Tournament.isTournamentPhase(obj.final)) {
      return false
    }
    return true
  }

  static async getTournament (): Promise<Tournament> {
    const db = new Database()
    const query = await db.getQuery('SELECT * FROM tournament', [])
    if (query.rows.length === 0) {
      throw new Error('tournament not found')
    } else {
      return new Tournament(query.rows[0].data)
    }
  }

  static async tournamentExists (): Promise<boolean> {
    const db = new Database()
    const query = await db.getQuery('SELECT * FROM tournament', [])
    return query.rows.length > 0
  }

  static async createTournament (...runners: number[]): Promise<Tournament> {
    const tournament: Tournament = new Tournament(...runners)

    await tournament.save()
    return tournament
  }

  static async getTournamentDate (): Promise<Date | null> {
    const db = new Database()
    const query = await db.getQuery('SELECT * FROM tournament_date', [])
    if (query.rows.length === 0) {
      return null
    } else {
      return query.rows[0].date
    }
  }

  getMatches (): Match[] {
    return [...this.bracket.start.matches, ...this.bracket.final.matches]
  }

  /** Get all the matches in a given phase of the tournament */
  getPhaseMatches (phase: TournamentPhase): Match[] {
    if (phase === TournamentPhase.Start) {
      return this.bracket.start.matches
    } else {
      return this.bracket.final.matches
    }
  }

  /**
   * Updates the score of a match
   * @param matchIndex Index of the match in the array from getMatches
   * @param standings Standings array for the match, which are the player IDs in the order they finished [1st, ..., 4th]
   * @returns
   */
  async updateScore (matchIndex: number, standings: number[]): Promise<undefined | number> {
    if (standings.length !== 4) {
      return 1
    }

    let targetMatches: Match[]
    let isFirstPhase: boolean = false
    if (this.bracket.start.matches.length > matchIndex) {
      isFirstPhase = true
      targetMatches = this.bracket.start.matches
    } else {
      matchIndex -= this.bracket.start.matches.length
      targetMatches = this.bracket.final.matches
    }
    if (targetMatches[matchIndex] === undefined) {
      return 2
    }
    targetMatches[matchIndex].standings = standings

    // these checks are for ending phases
    if (isFirstPhase) {
      this.endFirstPhaseIfComplete()
    } else {
      this.endTournamentIfComplete()
    }

    await this.save()
    return undefined
  }

  /** Get all the player points in a phase of the tournament */
  getPlayerPoints (phase: TournamentPhase): PlayerPoints {
    const playerPoints: PlayerPoints = {}

    for (const match of this.getPhaseMatches(phase)) {
      for (let i = 0; i < match.standings.length; i++) {
        const runner = match.standings[i]
        if (playerPoints[runner] === undefined) {
          playerPoints[runner] = 0
        }
        // index represents ranking in the match, so that's why we add points based on it
        switch (i) {
          case 0:
            playerPoints[runner] += Tournament.FIRST_PLACE_POINTS
            break
          case 1:
            playerPoints[runner] += Tournament.SECOND_PLACE_POINTS
            break
          case 2:
            playerPoints[runner] += Tournament.THIRD_PLACE_POINTS
            break
          case 3:
            playerPoints[runner] += Tournament.FOURTH_PLACE_POINTS
            break
        }
      }
    }

    return playerPoints
  }

  isFirstPhaseComplete (): boolean {
    for (const match of this.bracket.start.matches) {
      if (match.standings.length === 0) {
        return false
      }
    }
    return true
  }

  /** Get the ties occurring at each point number and all the players that have it, for the current phase */
  getTies (): { [points: number]: number[] } {
    const phase = this.getCurrentPhase()
    const playerPoints = this.getPlayerPoints(phase)

    const pointMap: { [key: number]: number } = {}
    for (const player in playerPoints) {
      if (pointMap[playerPoints[Number(player)]] === undefined) {
        pointMap[playerPoints[Number(player)]] = 0
      }
      pointMap[playerPoints[Number(player)]]++
    }
    const pointTies: { [key: number]: number[] } = {}

    for (const pointValue in pointMap) {
      const ties: number[] = []

      if (pointMap[Number(pointValue)] > 1) {
        for (const player in playerPoints) {
          if (playerPoints[Number(player)] === Number(pointValue)) {
            ties.push(Number(player))
          }
        }
      }

      pointTies[Number(pointValue)] = ties
    }

    return pointTies
  }

  /** Get the current phase of the tournament */
  getCurrentPhase (): TournamentPhase {
    if (this.isFirstPhaseComplete()) {
      return TournamentPhase.Final
    }
    return TournamentPhase.Start
  }

  /** Get the tie point mapping for the current phase */
  getTiePointMapping (): PointMapping {
    const phase = this.getCurrentPhase()
    return phase === TournamentPhase.Start ? this.tieStandings.first : this.tieStandings.final
  }

  /** Check if there is a pending tie in the current phase */
  containsTie (): boolean {
    const ties = this.getTies()
    const phasePointMapping = this.getTiePointMapping()
    
    for (const pointValue in ties) {
      // found more than one player tied, check if it has been resolved
      if (ties[Number(pointValue)].length > 1) {
        // if it's undefined, it hasn't been resolved yet
        if (phasePointMapping[Number(pointValue)] === undefined) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Get a ranking of the players in a given phase
   * @returns An array with all the runner IDs, with the first element representin the top spot, and so forth
   */
  getRankings (phase: TournamentPhase): number[] {
    const playerPoints = this.getPlayerPoints(phase)
    const tieStandings = phase === TournamentPhase.Start ? this.tieStandings.first : this.tieStandings.final

    const sortedPlayers = Object.keys(playerPoints).sort((a, b) => {
      const pointDiff = playerPoints[Number(a)] - playerPoints[Number(b)]
      if (pointDiff === 0) {
        const pointTieStandings = tieStandings[playerPoints[Number(a)]]
        // arbitrary ordering if tie hasn't been settled yet
        if (pointTieStandings === undefined) {
          return 1
        }
        const aIndex = pointTieStandings.indexOf(Number(a))
        const bIndex = pointTieStandings.indexOf(Number(b))
        return aIndex - bIndex
      } else {
        return pointDiff
      }
    })

    return sortedPlayers.map(player => Number(player))
  }

  /** Updates the matches in the final */
  updateFinalists (): void {
    const sortedPlayers = this.getRankings(TournamentPhase.Start)

    const finalists: PlayerStandings[] = []
    for (let i = 0; i < 4; i++) {
      finalists.push({
        runnerId: Number(sortedPlayers[i]),
        firsts: 0,
        seconds: 0,
        thirds: 0,
        fourths: 0
      })
    }

    this.bracket.final.players = finalists
    for (let i = 0; i < Tournament.FINAL_MATCHES; i++) {
      const runners = finalists.map(finalist => {
        return finalist.runnerId
      })
      this.bracket.final.matches.push({
        runners,
        standings: []
      })
    }
  }

  endFirstPhaseIfComplete (): void {
    if (this.isFirstPhaseComplete() && !this.containsTie()) {
      this.updateFinalists()
    }
  }

  endTournamentIfComplete (): void {
    if (this.hasFinalEnded() && !this.containsTie()) {
      this.isFinished = true
    }
  }

  /**
   * Settle ties in the tournament for all the given point values in the given object
   */
  async settleTies (pointMapping: PointMapping): Promise<void> {
    const phase = this.getCurrentPhase()
    if (phase === TournamentPhase.Start) {
      this.tieStandings.first = Object.assign(this.tieStandings.first, pointMapping)
      this.endFirstPhaseIfComplete()
    } else {
      this.tieStandings.final = Object.assign(this.tieStandings.final, pointMapping)
      this.endTournamentIfComplete()
    }
    await this.save()
  }

  /**
   * Saves the tournament to the database
   */
  async save (): Promise<void> {
    const db = new Database()

    const getQuery = await db.getQuery('SELECT * FROM tournament', [])
    if (getQuery.rows.length === 0) {
      await db.getQuery('INSERT INTO tournament (data) VALUES ($1)', [JSON.stringify(this)])
    } else {
      await db.getQuery('UPDATE tournament SET data = $1', [JSON.stringify(this)])
    }
  }

  /**
   * Check if the final phase (second phase) of the tournament has started
   */
  hasFinalStarted (): boolean {
    return this.bracket.final.matches.length > 0
  }

  /** Check if the final phase has ended (and thus the tournament, apart from tie settling) */
  hasFinalEnded (): boolean {
    return this.bracket.final.matches.every(match => match.standings.length > 0)
  }

  /**
   * Check if the tournament has finished the phase and is waiting to settle ties before starting the final phase
   */
  isWaitingToSettleTies (): boolean {
    const phase = this.getCurrentPhase()
    if (phase === TournamentPhase.Start) {
      return this.isFirstPhaseComplete() && this.containsTie() && !this.hasFinalStarted()
    } else {
      return this.hasFinalEnded() && this.containsTie()
    }
  }
}

export default Tournament
