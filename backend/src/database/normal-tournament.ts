import { isObject } from '../utils/utils'
import Tournament, { FinalStandings, Matchup, PlayerInfo } from './tournament'

/** Interface for a basic score reporting. */
interface MatchResults {
  /** Scores of both players in a match. The exact identity of the player is dictated by whichever the context this is being used in. */
  scores: [number, number]
}

/** Represents grand finals, which in a double elimination bracket contains the winner of both brackets. In the results, the first score is for the winner bracket player. */
interface GrandFinalsData {
  /** Results for the first match of the grand finals */
  results?: MatchResults
}

/** A match of the winner bracket. */
interface WinnerMatchData {
  /** The "left" side of the tree that leads to this match. It is either another match (in which case, the winner of that decides who is playing here), or a player ID, which represents they're playing (it should only be used at the start of the bracket). The player ID may be `null` if it represents that this is a "BYE", that is a "ghost player"  */
  left: WinnerMatchData | number | null
  /** The "right" side of the tree. It is the same as `left` but for the other side. */
  right: WinnerMatchData | number | null
  /** Results for the match, with the first one being score for the `left` player */
  results?: MatchResults
}

/** Represents the winner bracket. */
interface WinnerBracketData {
  /** Final match in the bracket. Loser goes to losers bracket, winner goes to grand finals. */
  final: WinnerMatchData
}

/** A match of the losers bracket in the very first round, which is exceptional because both players come from the winners bracket. */
interface StarterLoserMatchData {
  /** Scores, with the left one being the first. */
  results?: MatchResults
}

/** A match of the losers bracket for even rounds. They consist of one player coming from a previous loser match and another player coming from the winners bracket after losing.  */
interface EvenLoserMatchData {
  /** Loser bracket match where the winner gets to play in this match. */
  loserOrigin: OddLoserMatchData | StarterLoserMatchData
  /** Scores, with the winner player being the first. */
  results?: MatchResults
}

/** A match of the losers bracket for odd rounds (excluding the first round ). Consist of two players coming from the losers bracket. */
interface OddLoserMatchData {
  /** Match that leads to the player for the "left" side of the branch, which is the winner of the match. */
  left: EvenLoserMatchData | StarterLoserMatchData
  /** Same as `left`, but for the "other side" of the branch. */
  right: EvenLoserMatchData | StarterLoserMatchData
  /** Scores, with the left player being the first. */
  results?: MatchResults
}

/** Represents the Losers Bracket. */
interface LoserBracketData {
  /** Final, the winner goes to grand finals and the loser is 3rd place. */
  final: EvenLoserMatchData
}

// not a big fan of this class, might remove it.
/** Class for handling the players of a tournament */
class NormalTournamentPlayers {
  /** Player data */
  private readonly players: PlayerInfo[]

  constructor (players: PlayerInfo[]) {
    this.players = players
  }

  /** The tournament size, which is the smallest power of 2 that contains the player count. */
  get size (): number {
    return Math.ceil(Math.log2(this.players.length))
  }

  get length (): number {
    return this.players.length
  }

  /** Get ID of a player at the given index */
  getId (index: number): number {
    return this.players[index].id
  }
}

interface GrandFinalsRematchData {
  results?: MatchResults
}

/** Base class for all types of matches */
abstract class Match {
  results?: MatchResults
  /** Number of this match in the order the tournament should be played. */
  number?: number

  /** Get the winner of this match as an ID, or `undefined` if it hasn't been decided yet, or `null` if it is coming from a double BYE match */
  getWinner (): number | undefined | null {
    const matchup = this.getMatchup()
    const [left, right] = matchup
    if (left === null) {
      return right
    }
    if (right === null) {
      return left
    }
    if (this.results === undefined) {
      return undefined
    }

    // they must be number, otherwise results shouldn't be here
    if (typeof matchup[0] !== 'number' || typeof matchup[1] !== 'number') {
      throw new Error('No matchup but has scores')
    }

    return this.results.scores[0] > this.results.scores[1] ? matchup[0] : matchup[1]
  }

  /**
   * Get the loser of this match, if it has been decided. In the presence of "BYE" players, the other player is automatically
   * the winner
   * @returns
   */
  getLoser (): number | null | undefined {
    const [left, right] = this.getMatchup()
    if (left === null || right === null) {
      return null
    }
    if (this.results === undefined) {
      return undefined
    }
    return this.results.scores[0] > this.results.scores[1] ? right : left
  }

  /** Method that implements a way to get the matchup of two IDs, or `undefined` if either hasn't been decided or `null` if it is a "BYE" (ghost player) */
  abstract getMatchup (): [number | null | undefined, number | null | undefined]

  /**
   * Settle this match's scores
   * @param left Score of the "left" player
   * @param right Score of the "right" player
   */
  decide (left: number, right: number): void {
    if (this.results !== undefined) {
      throw new Error('Match already settled')
    }
    if (left === right) {
      throw new Error('Scores tie is not allowed')
    }
    this.results = { scores: [left, right] }
  }

  /** Checks if the matchup contains a "BYE" (ghost) player */
  hasBye (): boolean {
    return this.getMatchup().some(m => m === null)
  }
}

/** Class for the grand finals rematch, which only happens if the loser bracket winner beats the winner bracket winner */
class GrandFinalsRematch extends Match {
  /** Reference to the grand finals */
  grandFinals: GrandFinals

  constructor (grandFinals: GrandFinals) {
    super()
    this.grandFinals = grandFinals
  }

  override getMatchup (): [number | null | undefined, number | null | undefined] {
    return this.grandFinals.getMatchup()
  }

  getData (): GrandFinalsRematchData {
    return {
      results: this.results
    }
  }
}

/** Class for the grand finals, a match between winner of each bracket */
class GrandFinals extends Match {
  /** Reference to the winner final */
  winnerFinal: WinnerMatch
  /** Reference to the loser final */
  loserFinal: EvenLoserMatch

  constructor (winnerFinal: WinnerMatch, loserFinal: EvenLoserMatch) {
    super()
    this.winnerFinal = winnerFinal
    this.loserFinal = loserFinal
  }

  override getMatchup (): [number | null | undefined, number | null | undefined] {
    return [this.winnerFinal.getWinner(), this.loserFinal.getWinner()]
  }

  getData (): GrandFinalsData {
    return {
      results: this.results
    }
  }
}

/** Class that handles a winner match. */
class WinnerMatch extends Match {
  left: WinnerMatch | number | null
  right: WinnerMatch | number | null
  parent: WinnerMatch | null
  loserDestination: StarterLoserMatch | EvenLoserMatch | null

  constructor (left: WinnerMatch | number | null, right: WinnerMatch | number | null) {
    super()
    this.left = left
    this.right = right
    this.parent = null
    this.loserDestination = null
  }

  /** Makes both children reference this as a parent */
  setAsParentInChildren (): void {
    if (this.left instanceof WinnerMatch && this.right instanceof WinnerMatch) {
      this.left.parent = this
      this.right.parent = this
    }
  }

  /**
   * Create a winner match with the given players. If only the players are supplied, this will give a match such that it will
   * be the final match in a winner bracket. Otherwise, do not manually supply values because they are used for recursion
   * in this function's logic.
   * @param players Array with all players, assumed to be sorted in seeding order.
   * @param leftSeed If lower seed always wins, and assuming that the bracket begins balanced, this is the seed that will
   * play this match through the left side of the branch. Since the left side is the side of the "seed 1", it is always
   * going to be 1 at the start. There's more information on the algorithm within the function itself.
   * @param depth How many steps deep we are, considering the initial depth to be 1.
   * @returns Winner match with proper initial seeding of the players.
   */
  static fromPlayers (players: NormalTournamentPlayers, leftSeed: number = 1, depth: number = 1): WinnerMatch {
    // balanced seeding: the way this works is that seeds must be balanced in each round ideally. Just try to visualize this tree:
    //   1vs2
    //  /   \
    // 1vs4  2vs3
    // basically, the top is ideally going to be 1vs2, then, in the round below
    // the sum of each seed in each match has to be `number of different players + 1`
    // so in round below, there's 4 players, so sum of seeds is 4 + 1 = 5
    // then you just take to the left the lower seed, the right the higher seed, and determine the opponent
    // based on that little calculation. Do this recursively, backwards, until you get to the bottom.

    // add 1 so that it will begin at 2 for the number of players (winner finals)
    const size = players.size
    const numberOfPlayers = Math.pow(2, depth)
    const rightSeed = numberOfPlayers + 1 - leftSeed
    if (depth === size) {
      const matchPlayers: Array<number | null> = [leftSeed, rightSeed].map(s => {
        const index = s - 1
        if (index > players.length - 1) {
          return null
        } else {
          return players.getId(index)
        }
      })
      return new WinnerMatch(matchPlayers[0], matchPlayers[1])
    } else {
      const left = WinnerMatch.fromPlayers(players, leftSeed, depth + 1)
      const right = WinnerMatch.fromPlayers(players, rightSeed, depth + 1)
      const match = new WinnerMatch(left, right)
      match.setAsParentInChildren()
      return match
    }
  }

  static fromData (data: WinnerMatchData): WinnerMatch {
    if ((typeof (data.left) === 'number' || data.left === null) && (typeof (data.right) === 'number' || data.right === null)) {
      const match = new WinnerMatch(data.left, data.right)
      match.results = data.results
      return match
    } else if (isObject(data.left) && isObject(data.right)) {
      const left = WinnerMatch.fromData(data.left as WinnerMatchData)
      const right = WinnerMatch.fromData(data.right as WinnerMatchData)
      const match = new WinnerMatch(left, right)
      match.results = data.results
      match.setAsParentInChildren()
      return match
    } else {
      throw new Error('Improper winner match data')
    }
  }

  getData (): WinnerMatchData {
    if (this.left instanceof WinnerMatch && this.right instanceof WinnerMatch) {
      return {
        left: this.left.getData(),
        right: this.right.getData(),
        results: this.results
      }
    } else if (this.left instanceof WinnerMatch || this.right instanceof WinnerMatch) {
      throw new Error('Improper winner match')
    } else {
      return {
        left: this.left,
        right: this.right,
        results: this.results
      }
    }
  }

  override getMatchup (): [number | null | undefined, number | null | undefined] {
    if (this.left instanceof WinnerMatch) {
      return [this.left.getWinner(), (this.right as WinnerMatch).getWinner()]
    }

    return [this.left, this.right as (null | number)]
  }

  linkStarterLoserMatch (loser: StarterLoserMatch, isLeft: boolean): void {
    this.loserDestination = loser
    if (isLeft) {
      loser.leftWinnerOrigin = this
    } else {
      loser.rightWinnerorigin = this
    }
  }

  linkEvenLoserMatch (loser: EvenLoserMatch): void {
    this.loserDestination = loser
    loser.winnerOrigin = this
  }
}

/** Class that handles a winner bracket. */
class WinnerBracket {
  final: WinnerMatch

  constructor (final: WinnerMatch) {
    this.final = final
  }

  /** Creates a bracket from the given players and seeds them accordingly. */
  static fromPlayers (players: NormalTournamentPlayers): WinnerBracket {
    if (players.length < 2) {
      throw new Error('Number of players too small')
    }
    const final = WinnerMatch.fromPlayers(players)
    return new WinnerBracket(final)
  }

  static fromData (data: WinnerBracketData): WinnerBracket {
    const final = WinnerMatch.fromData(data.final)
    return new WinnerBracket(final)
  }

  getData (): WinnerBracketData {
    return {
      final: this.final.getData()
    }
  }

  /** Get the first round of the winner's bracket */
  getFirstRound (): WinnerRound {
    let queue = []
    let current = [this.final]

    while (true) {
      for (const match of current) {
        if (!(match.left instanceof WinnerMatch)) {
          return new WinnerRound(current)
        }
        queue.push(match.left)
        queue.push(match.right as WinnerMatch)
      }
      current = queue
      queue = []
    }
  }
}

class StarterLoserMatch extends Match {
  parent: EvenLoserMatch | null
  leftWinnerOrigin: WinnerMatch | null
  rightWinnerorigin: WinnerMatch | null

  constructor () {
    super()
    this.parent = null
    this.leftWinnerOrigin = null
    this.rightWinnerorigin = null
  }

  getData (): StarterLoserMatchData {
    return {
      results: this.results
    }
  }

  static fromData (data: StarterLoserMatchData): StarterLoserMatch {
    const match = new StarterLoserMatch()
    match.results = data.results
    return match
  }

  override getMatchup (): [number | null | undefined, number | null | undefined] {
    if (this.leftWinnerOrigin === null || this.rightWinnerorigin === null) {
      throw new Error('Should have initialized')
    }

    return [this.leftWinnerOrigin.getLoser(), this.rightWinnerorigin.getLoser()]
  }
}

class EvenLoserMatch extends Match {
  winnerOrigin: WinnerMatch | null
  loserOrigin: OddLoserMatch | StarterLoserMatch
  parent: OddLoserMatch | null
  results?: MatchResults

  constructor (loserOrigin: OddLoserMatch | StarterLoserMatch) {
    super()
    this.loserOrigin = loserOrigin
    this.parent = null
    this.winnerOrigin = null
  }

  /** Creates children matches assuming that this is a match in the given round of the losers bracket. */
  static fromRound (round: number): EvenLoserMatch {
    if (round % 2 === 1) {
      throw new Error('Must be even.')
    }
    if (round === 2) {
      const origin = new StarterLoserMatch()
      const match = new EvenLoserMatch(origin)
      origin.parent = match
      return match
    } else {
      const origin = OddLoserMatch.fromRound(round - 1)
      const match = new EvenLoserMatch(origin)
      origin.parent = match
      return match
    }
  }

  static fromData (data: EvenLoserMatchData): EvenLoserMatch {
    let loserOrigin
    if ((data.loserOrigin as any).left === undefined) {
      loserOrigin = StarterLoserMatch.fromData(data.loserOrigin as StarterLoserMatchData)
    } else {
      loserOrigin = OddLoserMatch.fromData(data.loserOrigin as OddLoserMatchData)
    }
    const match = new EvenLoserMatch(loserOrigin)
    loserOrigin.parent = match
    match.results = data.results
    return match
  }

  getData (): EvenLoserMatchData {
    return {
      loserOrigin: this.loserOrigin.getData(),
      results: this.results
    }
  }

  override getMatchup (): [number | null | undefined, number | null | undefined] {
    if (this.winnerOrigin === null) {
      throw new Error('Did not link winners match')
    }
    return [this.winnerOrigin.getLoser(), this.loserOrigin.getWinner()]
  }

  /**
   * Get the number of the origin match that doesn't contain an automatic victory "BYE" player
   * @returns
   */
  getNonByeOriginNumber (): number {
    let matchToWin
    // if there are TWO BYEs, then must trace back two steps behind to the match that has NO byes
    // with balanced matchmaking, this is the only time this would ever be a problem
    if (this.loserOrigin.hasBye()) {
      const loserOrigin = this.loserOrigin as StarterLoserMatch
      const leftPath = loserOrigin.leftWinnerOrigin as WinnerMatch
      const rightPath = loserOrigin.rightWinnerorigin as WinnerMatch
      if (leftPath.hasBye()) {
        matchToWin = rightPath.number
      } else {
        matchToWin = leftPath.number
      }
    } else {
      matchToWin = this.loserOrigin.number
    }

    if (matchToWin === undefined) {
      throw new Error('Impossible')
    }
    return matchToWin
  }
}

class OddLoserMatch extends Match {
  left: EvenLoserMatch
  right: EvenLoserMatch
  parent: EvenLoserMatch | null
  results?: MatchResults

  constructor (left: EvenLoserMatch, right: EvenLoserMatch) {
    super()
    this.left = left
    this.right = right
    this.parent = null
  }

  /** Create a match for the given round, with appropriate children matches */
  static fromRound (round: number): OddLoserMatch {
    if (round % 2 === 0) {
      throw new Error('Must be odd.')
    }
    const left = EvenLoserMatch.fromRound(round - 1)
    const right = EvenLoserMatch.fromRound(round - 1)
    const match = new OddLoserMatch(left, right)
    left.parent = match
    right.parent = match
    return match
  }

  static fromData (data: OddLoserMatchData): OddLoserMatch {
    const left = EvenLoserMatch.fromData(data.left as EvenLoserMatchData)
    const right = EvenLoserMatch.fromData(data.right as EvenLoserMatchData)
    const match = new OddLoserMatch(left, right)
    left.parent = match
    right.parent = match
    match.results = data.results
    return match
  }

  getData (): OddLoserMatchData {
    return {
      left: this.left.getData(),
      right: this.right.getData(),
      results: this.results
    }
  }

  override getMatchup (): [number | null | undefined, number | null | undefined] {
    return [this.left.getWinner(), this.right.getWinner()]
  }

  /**
   * Get the number of the origin match going beyond matches with automati wins (BYEs)
   * @param isLeft Whether or not the origin is from the left
   * @returns
   */
  getNonByeOriginNumber (isLeft: boolean): number {
    let origin
    if (isLeft) {
      if (this.left.hasBye()) {
        origin = this.left.winnerOrigin?.number
      } else {
        origin = this.left.number
      }
    } else {
      if (this.right.hasBye()) {
        origin = this.right.winnerOrigin?.number
      } else {
        origin = this.right.number
      }
    }

    if (origin === undefined) {
      throw new Error('Impossible')
    }
    return origin
  }
}

class LoserBracket {
  final: EvenLoserMatch

  constructor (final: EvenLoserMatch) {
    this.final = final
  }

  /** Create a blank loser bracket for a tournament with the given size (which is the power of 2 of the tournament, not the player count). */
  static fromSize (size: number): LoserBracket {
    if (size < 2) {
      throw new Error('Bracket size is too small')
    }
    const loserSize = 2 * (size - 1)
    const final = EvenLoserMatch.fromRound(loserSize)
    return new LoserBracket(final)
  }

  static fromData (data: LoserBracketData): LoserBracket {
    const final = EvenLoserMatch.fromData(data.final)
    return new LoserBracket(final)
  }

  getData (): LoserBracketData {
    return {
      final: this.final.getData()
    }
  }

  getFirstRound (): OddLoserRound {
    let evenCurrent: EvenLoserMatch[] = [this.final]
    let oddCurrent: OddLoserMatch[] = []
    let queue = []

    while (true) {
      for (const match of evenCurrent) {
        queue.push(match.loserOrigin)
      }
      if (queue[0] instanceof StarterLoserMatch) {
        return new OddLoserRound(queue as StarterLoserMatch[])
      }
      oddCurrent = queue as OddLoserMatch[]
      queue = []
      for (const match of oddCurrent) {
        queue.push(match.left)
        queue.push(match.right)
      }
      evenCurrent = queue
      queue = []
    }
  }
}

/** Object contains all information for a certain match. */
interface TournamentMatch {
  /** The plyers are either a number (the player ID, if it is KNOWN), a descriptive string saying which match needs to be won/lost to get there, or left blank if neither of those */
  player1?: number | string
  player2?: number | string
  results?: MatchResults
  /** Match number, in the order the matches should be done.It is `-1` if the match is a filler match containing BYEs. */
  n: number
}

/** Class for a round in the winners bracket */
class WinnerRound {
  matches: WinnerMatch[]

  constructor (matches: WinnerMatch[]) {
    this.matches = matches
  }

  /** Check if this is the last round (final's round) */
  isEnd (): boolean {
    return this.matches.length === 1
  }

  getNextRound (): WinnerRound {
    const nextMatches: WinnerMatch[] = []
    for (let i = 0; i < this.matches.length; i += 2) {
      const match = this.matches[i]
      if (match.parent === null) {
        throw new Error('Parent must not be null')
      }
      nextMatches.push(match.parent)
    }

    return new WinnerRound(nextMatches)
  }
}

/** Odd loser bracket round */
class OddLoserRound {
  matches: StarterLoserMatch[] | OddLoserMatch[]

  constructor (matches: StarterLoserMatch[] | OddLoserMatch[]) {
    this.matches = matches
  }

  getNextRound (): EvenLoserRound {
    const matches: EvenLoserMatch[] = []
    for (const match of this.matches) {
      if (match.parent === null) {
        throw new Error('Should not be null')
      }
      matches.push(match.parent)
    }

    return new EvenLoserRound(matches)
  }
}

/** Even loser bracket round */
class EvenLoserRound {
  matches: EvenLoserMatch[]

  constructor (matches: EvenLoserMatch[]) {
    this.matches = matches
  }

  /**
   * Get a version of this round with the inner order "flipped". This is used to do optimized matchmaking. The idea is basically flip this in order to minimize repetition in the loser bracket from the winner's bracket.
   * @param roundIndex Number of the current round - 1 (thus, 0-indexed)
   * @returns
   */
  flip (roundIndex: number): EvenLoserRound {
    const newRound = new EvenLoserRound(this.matches)
    const binary = roundIndex.toString(2).split('').reverse().join('')
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        newRound.flipFraction(i)
      }
    }

    return newRound
  }

  /**
   * Reverse the matches to a certain power. Eg, if power = 0, then we have "1" subarray, which means we just revert the whole thing. If power = 2, then we have 2**2 = 4 subarrays. So, we split the matches in 4 slices and revert each of those slices.
   * @param power
   * @returns
   */
  flipFraction (power: number): void {
    const partsNumber = Math.pow(2, power)
    const subarraySize = this.matches.length / partsNumber
    if (subarraySize < 2) {
      return
    }

    const subarrays = []

    for (let i = 0; i < partsNumber; i++) {
      subarrays.push(this.matches.slice(i * subarraySize, (i + 1) * subarraySize))
    }
    this.matches = []
    for (const subarray of subarrays) {
      this.matches.push(...subarray.reverse())
    }
  }

  getNextRound (): OddLoserRound {
    const nextMatches: OddLoserMatch[] = []
    for (let i = 0; i < this.matches.length; i += 2) {
      const match = this.matches[i]
      if (match.parent === null) {
        throw new Error('Parent must not be null')
      }
      nextMatches.push(match.parent)
    }

    return new OddLoserRound(nextMatches)
  }
}

/** Class for an ongoing tournament of Card-Jitsu */
export default class NormalTournament extends Tournament {
  winnersBracket: WinnerBracket
  losersBracket: LoserBracket
  grandFinals: GrandFinals
  grandFinalsRematch: GrandFinalsRematch

  constructor (value: any) {
    super(value)
    this.type = 'normal'
    if (Array.isArray(value)) {
      const tournamentPlayers = new NormalTournamentPlayers(this.players)
      this.winnersBracket = WinnerBracket.fromPlayers(tournamentPlayers)
      this.losersBracket = LoserBracket.fromSize(tournamentPlayers.size)
      this.grandFinals = new GrandFinals(this.winnersBracket.final, this.losersBracket.final)
      this.grandFinalsRematch = new GrandFinalsRematch(this.grandFinals)
    } else {
      this.winnersBracket = WinnerBracket.fromData(value.tournamentSpecific.winnersBracket)
      this.losersBracket = LoserBracket.fromData(value.tournamentSpecific.losersBracket)
      this.grandFinals = new GrandFinals(this.winnersBracket.final, this.losersBracket.final)
      this.grandFinals.results = value.tournamentSpecific.grandFinals.results
      this.grandFinalsRematch = new GrandFinalsRematch(this.grandFinals)
      this.grandFinalsRematch.results = value.tournamentSpecific.grandFinalsRematch.results
    }
    this.linkLoserDestinations()
  }

  /** Add the loser destination to the winner bracket matches. */
  linkLoserDestinations (): void {
    let wRound = this.winnersBracket.getFirstRound()
    const lStart = this.losersBracket.getFirstRound()

    // link first round
    wRound.matches.forEach((match, i) => {
      match.linkStarterLoserMatch(lStart.matches[Math.floor(i / 2)] as StarterLoserMatch, i % 2 === 0)
    })

    wRound = wRound.getNextRound()
    let lRound = lStart.getNextRound()

    let round = 1
    while (!wRound.isEnd()) {
      const rotatedLoserRound = lRound.flip(round)
      for (let i = 0; i < wRound.matches.length; i++) {
        wRound.matches[i].linkEvenLoserMatch(rotatedLoserRound.matches[i])
      }

      wRound = wRound.getNextRound()
      lRound = lRound.getNextRound().getNextRound()
      round++
    }

    // finals
    wRound.matches[0].linkEvenLoserMatch(lRound.matches[0])
  }

  /**
   * Iterate through every match in the order they are (should be) played
   * @param callback Callback to be applied to each match, taking as arguments the match itself and the match number, and the match number counting BYE matches
   */
  iterate (callback: (match: Match, n: number, on: number) => void): void {
    let wRound = this.winnersBracket.getFirstRound()
    let lOdd = this.losersBracket.getFirstRound()
    let lEven

    let number = 1
    let i = 1
    let isStart = true

    const useCallback = (match: Match): void => {
      const hasBye = match.hasBye()
      const n = hasBye ? -1 : number
      if (!hasBye) {
        number++
      }
      callback(match, n, i)
      i++
    }

    while (true) {
      for (const match of wRound.matches) {
        useCallback(match)
      }
      if (isStart) {
        isStart = false
      } else {
        if (lEven === undefined) {
          throw new Error('Impossible')
        }
        for (const match of lEven.matches.reverse()) {
          useCallback(match)
        }
        if (wRound.isEnd()) {
          break
        }
        lOdd = lEven.getNextRound()
      }
      for (const match of lOdd.matches) {
        useCallback(match)
      }

      wRound = wRound.getNextRound()
      lEven = lOdd.getNextRound()
    }

    useCallback(this.grandFinals)
    useCallback(this.grandFinalsRematch)
  }

  addMatchNumbers (): void {
    this.iterate((match, n) => {
      match.number = n
    })
  }

  /** Get all the matches of the tournament in order. */
  getMatches (): TournamentMatch[] {
    this.addMatchNumbers()

    const matches: TournamentMatch[] = []
    let didGrandFinals = false
    this.iterate((match, n, on) => {
      const matchup = match.getMatchup()
      if (match instanceof GrandFinals) {
        const [player1, player2] = matchup
        if (player1 === null || player2 === null) {
          throw new Error('Impossible BYE in grand finals')
        }
        const firstPlayers = [player1, player2].map((p, i) => {
          if (p === undefined) {
            if (i === 0) {
              return 'Winner of Winner Bracket'
            } else {
              return 'Winner of Loser Bracket'
            }
          } else {
            return p
          }
        })

        matches.push({
          player1: firstPlayers[0],
          player2: firstPlayers[1],
          n,
          results: match.results
        })

        // if this is already decided, we add a new one to represent the second one
        if (match.results !== undefined) {
          didGrandFinals = true
        }
      } else if (match instanceof GrandFinalsRematch) {
        if (didGrandFinals) {
          const [player1, player2] = matchup
          if (player1 === undefined || player2 === undefined) {
            throw new Error('Impossible, got to rematch without doing having rematch players')
          }
          if (player1 === null || player2 === null) {
            throw new Error('Impossible, BYE got to grand finals rematch')
          }

          matches.push({
            player1,
            player2,
            n,
            results: match.results
          })
        }
      } else {
        let players
        if (match instanceof WinnerMatch || match instanceof OddLoserMatch) {
          players = matchup.map((id, i) => {
            if (id === null) {
              return undefined
            } else if (id === undefined) {
              let matchOrigin
              if (i === 0) {
                if (match instanceof WinnerMatch) {
                  matchOrigin = (match.left as WinnerMatch).number
                } else {
                  matchOrigin = match.getNonByeOriginNumber(true)
                }
              } else {
                if (match instanceof WinnerMatch) {
                  matchOrigin = (match.right as WinnerMatch).number
                } else {
                  matchOrigin = match.getNonByeOriginNumber(false)
                }
              }
              if (matchOrigin === undefined) {
                throw new Error('Match number should not be undefined')
              }
              return `Winner of ${matchOrigin}`
            } else {
              return id
            }
          })
        } else if (match instanceof StarterLoserMatch) {
          players = matchup.map((id, i) => {
            if (id === undefined) {
              const number = i === 0 ? match.leftWinnerOrigin?.number : match.rightWinnerorigin?.number
              if (number === undefined) {
                throw new Error('Impossible')
              }
              return `Loser of ${number}`
            } else if (id === null) {
              return undefined
            } else {
              return id
            }
          })
        } else if (match instanceof EvenLoserMatch) {
          players = matchup.map((id, i) => {
            if (id === undefined) {
              if (i === 0) {
                const number = match.winnerOrigin?.number
                if (number === undefined) {
                  throw new Error('Impossible')
                }
                return `Loser of ${number}`
              } else {
                return `Winner of ${match.getNonByeOriginNumber()}`
              }
            } else if (id === null) {
              // if this is `null`, it means there's TWO games of `null` in a row
              return undefined
            } else {
              return id
            }
          })
        } else {
          throw new Error('Impossible')
        }
        matches.push({
          player1: players[0],
          player2: players[1],
          n,
          results: match.results
        })
      }
    })

    return matches
  }

  override isSpecificTournamentObject (tournamentSpecific: any): boolean {
    return true
  }

  override getSpecificData (): any {
    return {
      winnersBracket: this.winnersBracket.getData(),
      losersBracket: this.losersBracket.getData(),
      grandFinals: this.grandFinals.getData(),
      grandFinalsRematch: this.grandFinalsRematch.getData()
    }
  }

  static async createTournament (players: PlayerInfo[]): Promise<NormalTournament> {
    const tournament = new NormalTournament(players)
    await tournament.save()
    return tournament
  }

  /**
   * Decide a match's results
   * @param matchNumber Number of the match
   * @param leftScore Score of the "left" player
   * @param rightScore Score of the "right" player
   */
  async decideMatch (matchNumber: number, leftScore: number, rightScore: number): Promise<void> {
    let isRematchSkip = false
    this.iterate((m, n) => {
      if (n === matchNumber) {
        if (m instanceof GrandFinals) {
          // winner bracket winner won
          isRematchSkip = leftScore > rightScore
        } else if (m instanceof GrandFinalsRematch) {
          this.isFinished = true
        }
        m.decide(leftScore, rightScore)
      } else if (isRematchSkip && m instanceof GrandFinalsRematch) {
        // rematch is not needed
        m.decide(1, 0)
        this.isFinished = true
      }
    })

    await this.save()
  }

  override getFinalStandings (): FinalStandings {
    if (this.isFinished) {
      const standings: FinalStandings = []
      const winner = this.grandFinalsRematch.getWinner()
      const loser = this.grandFinalsRematch.getLoser()
      if (typeof winner !== 'number' || typeof loser !== 'number') {
        throw new Error('Tournament is finished and has no winner')
      }
      standings.push(winner, loser)

      let currentEven: EvenLoserMatch[] = [this.losersBracket.final]
      let currentOdd: Array<OddLoserMatch | StarterLoserMatch> = []
      let reachedBottom = false
      // add losers recursively until reaching the first losers round
      // everyone is eliminated by losing so we know we're getting everyone
      while (!reachedBottom) {
        const tiedEven = []
        for (const match of currentEven) {
          currentOdd.push(match.loserOrigin)
          const loser = match.getLoser()
          if (typeof loser === 'number') {
            tiedEven.push(loser)
          }
        }
        standings.push(tiedEven)
        currentEven = []
        const tiedOdd = []
        for (const match of currentOdd) {
          if (match instanceof StarterLoserMatch) {
            reachedBottom = true
          } else {
            currentEven.push(match.left, match.right)
          }
          const loser = match.getLoser()
          if (typeof loser === 'number') {
            tiedOdd.push(loser)
          }
        }
        currentOdd = []
        standings.push(tiedOdd)
      }
      return standings
    } else {
      return []
    }
  }

  override getMatchups(): Matchup[] {
    const matches = this.getMatches()
    return matches.filter((match) => match.n !== -1 && match.results === undefined).map((match) => {
      const players = []
      if (typeof match.player1 === 'number') {
        players.push(match.player1)
      }
      if (typeof match.player2 === 'number') {
        players.push(match.player2)
      }
      return { players }
    })
  }
}
