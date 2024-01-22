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

  static generateMatches (runners: number[]): Match[] {
    const matches: Match[] = []

    let untakenPlayers:{[key: number]: boolean} = {}
    let takenPlayers:{[key: number]: boolean} = {}

    const resetTakenPlayers = () => {
      untakenPlayers = {}
      takenPlayers = {}
      for (const runner of runners) {
        untakenPlayers[runner] = true
        takenPlayers[runner] = false
      }
    }

    const getRandomPlayer = (): number => {
      const keys = Object.keys(untakenPlayers)
      const randomIndex = Math.floor(Math.random() * keys.length)

      if (untakenPlayers[Number(keys[randomIndex])] === true) {
        return Number(keys[randomIndex])
      } else {
        // search for closest untaken
        for (let i = 0; i < keys.length; i++) {
          const searchIndex = (randomIndex + i) % keys.length
          if (untakenPlayers[Number(keys[searchIndex])] === true) {
            return Number(keys[searchIndex])
          }
        }
        // if no player is found, we need to reset and go again because all players are taken
        resetTakenPlayers()
        return getRandomPlayer()
      }
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
      while (newMatch.runners.length < 4) {
        const player = getRandomPlayer()
        newMatch.runners.push(player)
        untakenPlayers[player] = false
        takenPlayers[player] = true
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
