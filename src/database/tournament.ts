import Database from './database'

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

class Tournament {
  bracket: Bracket

  constructor (...args: any[]) {
    if (args.length === 0) {
      throw new Error('no arguments provided')
    }
    if (args.length === 1 && Tournament.isBracket(args[0])) {
      this.bracket = args[0]
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

  static generateMultipleOfFourMatches (runners: number[]): Match[] {
    const matches: Match[] = []
    // matches can always be divided in 4 blocks
    for (let i = 0; i < 4; i++) {
      // the overall idea here: put all players in a line and then group then by increments which get bigger
      // ignore the players that have already been grouped if they end up being in the same group
      // this will generate a list of matchups which then are broken into matches
      // and each player plays only once in each of these blocks so in total they will play 4 times
      const increment: number = i + 1
      const matchups: number[] = []

      // using index for the player, converting to their id at the end
      let currentPlayer: number = 0
      while (matchups.length < runners.length) {
        while (matchups.includes(currentPlayer)) {
          currentPlayer = (currentPlayer + 1) % runners.length
        }
        matchups.push(currentPlayer)
        currentPlayer = (currentPlayer + increment) % runners.length
      }

      for (let j = 0; j < matchups.length; j += 4) {
        const matchPlayers = matchups.slice(j, j + 4).map((x: number) => runners[x])
        matches.push({
          runners: matchPlayers,
          standings: []
        })
      }
    }
    return matches
  }

  static swapPlayersInMatches (match1: Match, match2: Match, match1Swap: number, match2Swap: number): void {
    const temp: number = match1.runners[match1Swap]
    match1.runners[match1Swap] = match2.runners[match2Swap]
    match2.runners[match2Swap] = temp
  }

  static generateMatches (runners: number[]): Match[] {
    const multiple = Math.floor(runners.length / 4) * 4
    const matches: Match[] = Tournament.generateMultipleOfFourMatches(runners.slice(0, multiple))

    // the idea of this algorithm is to take the remaining players and spread them across the generated matches
    // from the previous step, making sure that each player plays 4 times and that they don't play twice in the same match
    const remainingPlayers = runners.slice(multiple)
    let addedPlayers: number = 0
    for (const player of remainingPlayers) {
      const newMatch: Match = {
        runners: [player, player, player, player],
        standings: []
      }
      for (let i = 0; i < 3; i++) {
        // addedPlayers is being used just to displace the index by 1
        const swapMatchIndex = addedPlayers % 2 + i * 2
        for (const runner of matches[swapMatchIndex].runners) {
          if (!newMatch.runners.includes(runner)) {
            Tournament.swapPlayersInMatches(matches[swapMatchIndex], newMatch, matches[swapMatchIndex].runners.indexOf(runner), i)
            break
          }
        }
      }
      addedPlayers++
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

    const numbers = ['runner1', 'runner2', 'runner3', 'runner4']
    for (const number of numbers) {
      if (obj[number] === undefined || typeof (obj[number]) !== 'number') {
        return false
      }
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

  static async createTournament (...runners: number[]): Promise<Tournament> {
    const tournament: Tournament = new Tournament(...runners)

    const db = new Database()

    const getQuery = await db.getQuery('SELECT * FROM tournament', [])
    if (getQuery.rows.length === 0) {
      await db.getQuery('INSERT INTO tournament (data) VALUES ($1)', [JSON.stringify(new Tournament(...runners))])
    } else {
      await db.getQuery('UPDATE tournament SET data = $1', [JSON.stringify(new Tournament(...runners))])
    }
    return tournament
  }
}

export default Tournament
