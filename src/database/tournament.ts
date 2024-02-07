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

interface TournamentPhase {
  players: PlayerStandings[]
  matches: Match[]
}

interface Bracket {
  start: TournamentPhase
  final: TournamentPhase
}

interface TieStandings {
  [key: number]: number[]
}

class Tournament {
  bracket: Bracket

  static readonly FIRST_PLACE_POINTS = 4
  static readonly SECOND_PLACE_POINTS = 3
  static readonly THIRD_PLACE_POINTS = 1
  static readonly FOURTH_PLACE_POINTS = 0
  static readonly FINAL_MATCHES = 3

  tieStandings: TieStandings = {}

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

  static isTournamentPhase (obj: any): obj is TournamentPhase {
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

    if (isFirstPhase) {
      if (this.isFirstPhaseComplete() && !this.containsTie()) {
        this.updateFinalists()
      }
    }

    await this.save()
    return undefined
  }

  getPlayerPoints (): PlayerPoints {
    const playerPoints: PlayerPoints = {}

    for (const match of this.getMatches()) {
      for (let i = 0; i < match.standings.length; i++) {
        const runner = match.runners[match.standings[i]]
        if (playerPoints[runner] === undefined) {
          playerPoints[runner] = 0
        }
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

  /** Get the ties occurring at each point number and all the players that have it */
  // for the future, this will need to be changed to accomodate first phase and second phase ties separatedly
  getTies (): { [points: number]: number[] } {
    const playerPoints = this.getPlayerPoints()

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

  containsTie (): boolean {
    const ties = this.getTies()
    for (const pointValue in ties) {
      if (ties[Number(pointValue)].length > 1) {
        return true
      }
    }
    return false
  }

  updateFinalists (): void {
    const playerPoints = this.getPlayerPoints()

    const sortedPlayers = Object.keys(playerPoints).sort((a, b) => {
      const pointDiff = playerPoints[Number(a)] - playerPoints[Number(b)]
      if (pointDiff === 0) {
        const tieStandings = this.tieStandings[playerPoints[Number(a)]]
        const aIndex = tieStandings.indexOf(Number(a))
        const bIndex = tieStandings.indexOf(Number(b))
        return aIndex - bIndex
      } else {
        return pointDiff
      }
    })

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

  /**
   * Settle ties in the tournament for all the given point values in the given object
   */
  async settleTies (tieStandings: TieStandings): Promise<void> {
    this.tieStandings = Object.assign(this.tieStandings, tieStandings)
    this.updateFinalists()
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
  hasFinalStarted(): boolean {
    return this.bracket.final.matches.length > 0
  }

  /**
   * Check if the tournament has finished first phase and is waiting to settle ties before starting the final phase
   */
  isWaitingToSettleTies(): boolean {
    return this.isFirstPhaseComplete() && this.containsTie() && !this.hasFinalStarted()
  }
}

export default Tournament
