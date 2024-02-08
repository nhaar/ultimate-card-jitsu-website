import { isObject, isStringNumber } from '../utils/utils'
import Database from './database'

interface PlayerPoints {
  [key: number]: number
}

/** All player data */
export interface PlayerInfo {
  /** Id as in the database */
  id: number
  /** Name for readability only */
  name: string
}

interface Match {
  runners: number[]

  // this array organizes the runners in the order they finished using the "runner index",
  // eg [2, 0, 1, 3] means index 2 of runners finished first, and so forth
  standings: number[]
}

interface TournamentPhaseData {
  matches: Match[]
}

/** Object storing the bracket, which will handles all matches */
interface Bracket {
  /** Matches in the first phase */
  start: TournamentPhaseData
  /** Matches of the final */
  final: TournamentPhaseData
  /** Info from all players in the tournament */
  players: PlayerInfo[]
}

/** Object that stores a singular player's stats within a phase */
interface RankingInfo {
  player: number
  points: number
  firstPlace: number
  secondPlace: number
  thirdPlace: number
  fourthPlace: number
}

/**
 * Object that stores all of the rankings of all players. It should be sorted such that the first level in the array
 * corresponds to all the players tied to that rank, and the second level in the array contains the ranking info for all players in the tie. If there is no tie, the second level array will only contain one element.
 */
type Ranking = RankingInfo[][]

/** Object in the template of the Tournament objects serialized into JSON, and used for storing in the database */
interface TournamentObject {
  bracket: Bracket
  isFirstPhaseFinished: boolean
  isFinished: boolean
  tieStandings: TieStandings
  // left optional because when this is stored as a backup it doesn't have this property, to avoid circular backup and exponential growth of memory
  backups?: string[]
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

  /** Contains multiple backups of the tournament as serialized JSON, with the first element being the most recent one */
  backups: string[] = []

  /** Whether or not the first phase of the tournament is fully done, including tie settling */
  isFirstPhaseFinished: boolean = false
  /** Whether or not this tournament is finished */
  isFinished: boolean = false

  /** Creates the tournament from the JSON object in the database (that is, already parsed here as an object) */
  constructor (tournamentObject: TournamentObject)

  /** Creates the tournament from scratch by giving in all the players that will play */
  constructor (...runners: PlayerInfo[])

  constructor (...args: any[]) {
    if (args.length === 0) {
      throw new Error('no arguments provided')
    }
    if (args.length === 1 && Tournament.isTournamentObject(args[0])) {
      const object = args[0] as TournamentObject

      // need to do all properties so they can be initialized properly in typescript
      this.bracket = object.bracket
      this.isFirstPhaseFinished = object.isFirstPhaseFinished
      this.isFinished = object.isFinished
      this.tieStandings = object.tieStandings
      this.backups = object.backups ?? []
    } else {
      const players: PlayerInfo[] = []
      for (const runner of args) {
        if (!Tournament.isPlayerInfo(runner)) {
          throw new Error(`invalid player info: ${String(runner)}`)
        }
        players.push(runner)
      }
      this.bracket = {
        start: {
          matches: Tournament.generateMatches(players.map(player => player.id))
        },
        final: {
          matches: []
        },
        players
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

  static isPlayerInfo (obj: any): obj is PlayerInfo {
    if (typeof (obj) !== 'object' || obj === null || Array.isArray(obj)) {
      return false
    }

    if (typeof (obj.id) !== 'number' || typeof (obj.name) !== 'string') {
      return false
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
    if (!Array.isArray(obj.matches) || obj.matches.every(Tournament.isMatch) === false) {
      return false
    }
    return true
  }

  static isTournamentObject (obj: any): obj is TournamentObject {
    if (isObject(obj) === false) {
      return false
    }
    if (!Tournament.isBracket(obj.bracket)) {
      return false
    }
    if (typeof (obj.isFirstPhaseFinished) !== 'boolean' || typeof (obj.isFinished) !== 'boolean') {
      return false
    }
    if (!Tournament.isTieStandings(obj.tieStandings)) {
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
    if (!Array.isArray(obj.players) || obj.players.every(Tournament.isPlayerInfo) === false) {
      return false
    }
    return true
  }

  static isTieStandings (obj: any): obj is TieStandings {
    if (isObject(obj) === false) {
      return false
    }
    if (!Tournament.isPointMapping(obj.first) || !Tournament.isPointMapping(obj.final)) {
      return false
    }
    return true
  }

  static isPointMapping (obj: any): obj is PointMapping {
    if (isObject(obj) === false) {
      return false
    }
    for (const key in obj) {
      if (!isStringNumber(key) || !Array.isArray(obj[key]) || obj[key].every((x: any) => typeof (x) === 'number') === false) {
        return false
      }
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

  static async createTournament (...runners: PlayerInfo[]): Promise<Tournament> {
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

  /**
   * Get how many points is awarded for finishing a match in a given positon/rank
   * @param position The position of the player in the match, starting from 1, eg 1st place is 1. Has to be between 1 and 4 including.
   * */
  static getPositionPoints (position: number): number {
    switch (position) {
      case 1:
        return Tournament.FIRST_PLACE_POINTS
      case 2:
        return Tournament.SECOND_PLACE_POINTS
      case 3:
        return Tournament.THIRD_PLACE_POINTS
      case 4:
        return Tournament.FOURTH_PLACE_POINTS
      default:
        throw new Error('invalid position')
    }
  }

  /**
   * Iterates through every match and every standing in the match in a given phase, calling the callback for each standing
   * @param callback Function that takes the match object and the index of the standing in the match and returns nothing
   */
  iterateEveryMatchStanding (phase: TournamentPhase, callback: (match: Match, standingIndex: number) => void): void {
    const matches = this.getPhaseMatches(phase)
    for (const match of matches) {
      for (let i = 0; i < match.standings.length; i++) {
        callback(match, i)
      }
    }
  }

  /** Get all the player points in a phase of the tournament */
  getPlayerPoints (phase: TournamentPhase): PlayerPoints {
    const playerPoints: PlayerPoints = {}
    const players = this.getPlayerIds()
    for (const player of players) {
      playerPoints[player] = 0
    }

    this.iterateEveryMatchStanding(phase, (match, standingIndex) => {
      const runner = match.standings[standingIndex]
      playerPoints[runner] += Tournament.getPositionPoints(standingIndex + 1)
    })

    return playerPoints
  }

  /** Get an array containing all ID of all players in the tournament */
  getPlayerIds (): number[] {
    return this.bracket.players.map(player => player.id)
  }

  /** Get the rankings of all players in the tournament, mapped without any specific order */
  getPlayerRankings (phase: TournamentPhase): { [id:number]: RankingInfo } {
    const playerRankings:{ [id:number]: RankingInfo } = {}
    const players = this.getPlayerIds()
    for (const player of players) {
      playerRankings[player] = {
        player,
        points: 0,
        firstPlace: 0,
        secondPlace: 0,
        thirdPlace: 0,
        fourthPlace: 0
      }
    }
  
    this.iterateEveryMatchStanding(phase, (match, standingIndex) => {
      const runner = match.standings[standingIndex]
      playerRankings[runner].points += Tournament.getPositionPoints(standingIndex + 1)
      switch (standingIndex) {
        case 0:
          playerRankings[runner].firstPlace++
          break
        case 1:
          playerRankings[runner].secondPlace++
          break
        case 2:
          playerRankings[runner].thirdPlace++
          break
        case 3:
          playerRankings[runner].fourthPlace++
          break
      }
    })

    return playerRankings
  }

  /**
   * Checks whether the first phase matches have been completed, without tie settling
   */
  areFirstPhaseMatchesComplete (): boolean {
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
    return this.isFirstPhaseFinished ? TournamentPhase.Final : TournamentPhase.Start
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
   * Get the ranking object of the players in a given phase
   */
  getRankings (phase: TournamentPhase): Ranking {
    const playerRankings = this.getPlayerRankings(phase)
    const tieStandings = phase === TournamentPhase.Start ? this.tieStandings.first : this.tieStandings.final

    const players = Object.keys(playerRankings).map(player => Number(player))
    const sortedPlayers = players.sort((a, b) => {
      const pointDiff = playerRankings[b].points - playerRankings[a].points
      if (pointDiff === 0) {
        const pointTieStandings = tieStandings[playerRankings[a].points]
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

    const ties = this.getTies()
    const ranking = []
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i]
      const playerRanking = playerRankings[player]
      const settledTieStandings = tieStandings[playerRanking.points]

      // coalesce to empty because it can also be empty, so we are unifying the cases
      const tiePlayers = ties[playerRanking.points] ?? []
      
      // first being empty means isn't in a tie, second not being undefined means it's been settled (and this is sorted already)
      if (tiePlayers.length === 0 || settledTieStandings !== undefined) {
        ranking.push([playerRanking])
      } else {
        const currentRanking = []
        i--
        for (const tiedPlayer of ties[playerRanking.points]) {
          currentRanking.push(playerRankings[tiedPlayer])
          i++
        }
        ranking.push(currentRanking)
      }
    }

    return ranking
  }

  /** Updates the matches in the final */
  updateFinalists (): void {
    const sortedPlayers = this.getRankings(TournamentPhase.Start)
    const finalists = sortedPlayers.slice(0, 4).map(player => player[0].player)

    for (let i = 0; i < Tournament.FINAL_MATCHES; i++) {
      this.bracket.final.matches.push({
        runners: [...finalists],
        standings: []
      })
    }
  }

  endFirstPhaseIfComplete (): void {
    if (this.areFirstPhaseMatchesComplete() && !this.containsTie()) {
      this.isFirstPhaseFinished = true
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

  /** Rollback the tournament to the last backup in the database */
  async rollback (): Promise<void> {
    // last backup should be the current state, so discard it, and use the next one
    this.backups.shift()
    const backuptoUse = this.backups[0]

    // no backups, don't do anything
    if (backuptoUse === undefined) {
      return
    }
  
    const backedupTournament = JSON.parse(backuptoUse)
    if (!Tournament.isTournamentObject(backedupTournament)) {
      throw new Error('invalid backup')
    }
    backedupTournament.backups = [...this.backups]
    const newTournament = new Tournament(backedupTournament)
    
    // skip backup because it would be the same as the latest snapshot
    await newTournament.save(false)
  }

  /**
   * Get a serialized JSON of the tournament without the backups
   */
  serializeWithoutBackup (): string {
    return JSON.stringify({
      bracket: this.bracket,
      isFirstPhaseFinished: this.isFirstPhaseFinished,
      isFinished: this.isFinished,
      tieStandings: this.tieStandings
    })
  }

  /**
   * Saves the tournament to the database
   * @param createBackup Whether or not to create a backup of the tournament before saving it
   */
  async save (createBackup: boolean = true): Promise<void> {
    if (createBackup) {
      this.backups.splice(0, 0, this.serializeWithoutBackup())
    }
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
      return this.areFirstPhaseMatchesComplete() && this.containsTie() && !this.hasFinalStarted()
    } else {
      return this.hasFinalEnded() && this.containsTie()
    }
  }

  /** Returns a map of all players in the tournament from their IDs to their name */
  getPlayerInfo (): { [id: number]: string } {
    const playerInfo: { [id: number]: string } = {}
    for (const player of this.bracket.players) {
      playerInfo[player.id] = player.name
    }
    return playerInfo
  }
}

export default Tournament
