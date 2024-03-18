import { isObject, isStringNumber } from '../utils/utils'
import Database from './database'
import Tournament from './tournament'

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
  /** Array with all player IDs in the match, or of `null`, if they are not yet decided */
  runners: Array<number | null>

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

/** Class that handles an ongoing tournament of Card-Jitsu Fire */
class FireTournament extends Tournament {
  bracket: Bracket = {
    start: { matches: [] },
    final: { matches: [] }
  }

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

  /** Whether or not the first phase of the tournament is fully done, including tie settling */
  isFirstPhaseFinished: boolean = false
  /** Whether or not this tournament is finished */
  isFinished: boolean = false

  override createFromSpecificData (specific: any): void {
    this.bracket = specific.bracket
    this.isFirstPhaseFinished = specific.isFirstPhaseFinished
    this.isFinished = specific.isFinished
    this.tieStandings = specific.tieStandings
  }

  override createFromPlayers (players: PlayerInfo[]): void {
    this.bracket = {
      start: {
        matches: FireTournament.generateFirstPhaseMatches(players.map(player => player.id))
      },
      final: {
        matches: FireTournament.generateFinalPhaseMatches()
      }
    }
  }

  /**
   * Generates all the matches for the first phase of the tournament
   */
  static generateFirstPhaseMatches (runners: number[]): Match[] {
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

  /** Generate all the matches for the final phase of the tournament */
  static generateFinalPhaseMatches (): Match[] {
    const matches = []
    // final matches, matches with no players at the moment
    for (let i = 0; i < FireTournament.FINAL_MATCHES; i++) {
      matches.push({
        runners: [null, null, null, null],
        standings: []
      })
    }

    return matches
  }

  static isMatch (obj: any): obj is Match {
    if (typeof (obj) !== 'object' || obj === null || Array.isArray(obj)) {
      return false
    }

    if (!Array.isArray(obj.runners) || obj.runners.every((x: any) => typeof (x) === 'number' || x === null) === false || obj.runners.length !== 4) {
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
    if (!Array.isArray(obj.matches) || obj.matches.every(FireTournament.isMatch) === false) {
      return false
    }
    return true
  }

  override isSpecificTournamentObject (tournamentSpecific: any): boolean {
    if (!isObject(tournamentSpecific)) {
      return false
    }
    if (!FireTournament.isBracket(tournamentSpecific.bracket)) {
      return false
    }
    if (typeof (tournamentSpecific.isFirstPhaseFinished) !== 'boolean' || typeof (tournamentSpecific.isFinished) !== 'boolean') {
      return false
    }
    if (!FireTournament.isTieStandings(tournamentSpecific.tieStandings)) {
      return false
    }
    return true
  }

  static isBracket (obj: any): obj is Bracket {
    if (typeof (obj) !== 'object' || obj === null || Array.isArray(obj)) {
      return false
    }
    if (!FireTournament.isTournamentPhase(obj.start) || !FireTournament.isTournamentPhase(obj.final)) {
      return false
    }

    return true
  }

  static isTieStandings (obj: any): obj is TieStandings {
    if (!isObject(obj)) {
      return false
    }
    if (!FireTournament.isPointMapping(obj.first) || !FireTournament.isPointMapping(obj.final)) {
      return false
    }
    return true
  }

  static isPointMapping (obj: any): obj is PointMapping {
    if (!isObject(obj)) {
      return false
    }
    for (const key in obj) {
      if (!isStringNumber(key) || !Array.isArray(obj[key]) || obj[key].every((x: any) => typeof (x) === 'number') === false) {
        return false
      }
    }
    return true
  }

  static async getTournament (): Promise<FireTournament | undefined> {
    const db = new Database()
    const query = await db.getQuery('SELECT * FROM tournament', [])
    if (query.rows.length === 0) {
      return undefined
    } else {
      return new FireTournament(query.rows[0].data)
    }
  }

  static async tournamentExists (): Promise<boolean> {
    const db = new Database()
    const query = await db.getQuery('SELECT * FROM tournament', [])
    return query.rows.length > 0
  }

  static async createTournament (runners: PlayerInfo[]): Promise<FireTournament> {
    const tournament: FireTournament = new FireTournament(runners)

    await tournament.save()
    return tournament
  }

  /**
   * Get the scheduled date for the tournament
   * @returns Timestamp of the date in string format and in miliseconds since start of unix, or null if it hasn't been set
   */
  static async getTournamentDate (): Promise<string | null> {
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
        return FireTournament.FIRST_PLACE_POINTS
      case 2:
        return FireTournament.SECOND_PLACE_POINTS
      case 3:
        return FireTournament.THIRD_PLACE_POINTS
      case 4:
        return FireTournament.FOURTH_PLACE_POINTS
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
    const players = this.getPlayerIds(phase)
    for (const player of players) {
      playerPoints[player] = 0
    }

    this.iterateEveryMatchStanding(phase, (match, standingIndex) => {
      const runner = match.standings[standingIndex]
      playerPoints[runner] += FireTournament.getPositionPoints(standingIndex + 1)
    })

    return playerPoints
  }

  /** Get an array containing all ID of all players in a phase of the tournament */
  getPlayerIds (phase: TournamentPhase): number[] {
    if (phase === TournamentPhase.Start) {
      return this.players.map(player => player.id)
    } else {
      // all finalists should be in any of the matches of the final

      // at this point there should be no `null` players in the array.
      const players = this.bracket.final.matches[0].runners
      const finalPlayers = []
      for (const player of players) {
        if (player === null) {
          throw new Error('null player in final match')
        }
        finalPlayers.push(player)
      }
      return finalPlayers
    }
  }

  /** Get the rankings of all players in the tournament, mapped without any specific order */
  getPlayerRankings (phase: TournamentPhase): { [id: number]: RankingInfo } {
    const playerRankings: { [id: number]: RankingInfo } = {}
    const players = this.getPlayerIds(phase)
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
      playerRankings[runner].points += FireTournament.getPositionPoints(standingIndex + 1)
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

    for (let i = 0; i < FireTournament.FINAL_MATCHES; i++) {
      this.bracket.final.matches[i].runners = [...finalists]
    }
  }

  endFirstPhaseIfComplete (): void {
    if (this.areFirstPhaseMatchesComplete() && !this.containsTie()) {
      this.updateFinalists()
      this.isFirstPhaseFinished = true
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
    if (!this.isTournamentObject(backedupTournament)) {
      throw new Error('invalid backup')
    }
    backedupTournament.backups = [...this.backups]
    const newTournament = new FireTournament(backedupTournament)

    // skip backup because it would be the same as the latest snapshot
    await newTournament.save(false)
  }

  override getSpecificData (): any {
    return {
      bracket: this.bracket,
      isFirstPhaseFinished: this.isFirstPhaseFinished,
      isFinished: this.isFinished,
      tieStandings: this.tieStandings
    }
  }

  /**
   * Check if the final phase (second phase) of the tournament has started
   */
  hasFinalStarted (): boolean {
    return this.bracket.final.matches[0].runners.every(runner => runner !== null)
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
    for (const player of this.players) {
      playerInfo[player.id] = player.name
    }
    return playerInfo
  }

  /**
   * Updates date for the start of the tournament
   * @param date Miliseconds since epoch in string format
   */
  static async setTournamentDate (date: string): Promise<void> {
    const db = new Database()
    const query = await db.getQuery('SELECT * FROM tournament_date', [])
    if (query.rows.length === 0) {
      await db.getQuery('INSERT INTO tournament_date (date) VALUES ($1)', [date])
    } else {
      await db.getQuery('UPDATE tournament_date SET date = $1', [date])
    }
  }

  /** Removes the scheduled tournament date */
  static async removeTournamentDate (): Promise<void> {
    const db = new Database()
    await db.getQuery('DELETE FROM tournament_date', [])
  }

  /** Deletes an active tournament */
  static async deleteTournament (): Promise<void> {
    const db = new Database()
    await db.getQuery('DELETE FROM tournament', [])
  }

  /** Get a string descriptor of the current phase, used for display by the stream */
  getDisplayPhase (): string {
    const matches = this.getMatches()

    // "1-indexed"
    let matchNumber = 1
    for (const match of matches) {
      if (match.standings.length === 0) {
        break
      }
      matchNumber++
    }

    let phaseString = ''
    if (this.isFinished) {
      return 'FINISHED!'
    } else if (this.isFirstPhaseFinished) {
      phaseString = 'FINALS'
    } else {
      phaseString = 'START'
    }

    return `${phaseString}: MATCH #${matchNumber}`
  }

  /**
   * Get the final standings, a list of all the player IDs from 1st to last
   * @returns The standings or undefined if the tournament isn't finished yet
   */
  getFinalStandings (): number[] | undefined {
    if (!this.isFinished) {
      return undefined
    } else {
      const rankingsFirstPhase = this.getRankings(TournamentPhase.Start)
      const rankingsFinalPhase = this.getRankings(TournamentPhase.Final)

      const standings: number[] = []

      function pushToStandingsFromRankings (rankings: Ranking, indexStart: number): void {
        let i = 0
        for (const rankingArray of rankings) {
          if (indexStart <= i) {
            // because the rankings are decided, the array will have only one element which is the player itself
            const player = rankingArray[0].player
            standings.push(player)
          }
          i++
        }
      }

      pushToStandingsFromRankings(rankingsFinalPhase, 0)
      pushToStandingsFromRankings(rankingsFirstPhase, 4)

      return standings
    }
  }
}

export default FireTournament
