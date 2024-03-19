import { isObject } from '../utils/utils'
import Tournament, { PlayerInfo } from './tournament'

/** Interface for a basic score reporting. */
interface MatchResults {
  /** Scores of both players in a match. The exact identity of the player is dictated by whichever the context this is being used in. */
  scores: [number, number]
}

/** Represents grand finals, which in a double elimination bracket contains the winner of both brackets. In the results, the first score is for the winner bracket player. */
interface GrandFinals {
  /** ID of player that won winner bracket, or `null` if not decided */
  winnerBracketPlayer: number | null
  /** ID of player that won loser bracket, or `null` if not decided */
  loserBracketPlayer: number | null
  /** Results for the first match of the grand finals */
  firstMatch?: MatchResults
  /** Results for the second match, if it happened */
  secondMatch?: MatchResults
}

/** A match of the winner bracket. */
interface WinnerMatchData {
  /** The "left" side of the tree that leads to this match. It is either another match (in which case, the winner of that decides who is playing here), or a player ID, which represents they're playing (it should only be used at the start of the bracket)  */
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
  /** Player coming from the winners bracket from the "left", or `null` if it hasn't been decided yet.  */
  left: number | null
  /** Same as left, but in the "other side of the branch". */
  right: number | null
  /** Scores, with the left one being the first. */
  results?: MatchResults
}

/** A match of the losers bracket for even rounds. They consist of one player coming from a previous loser match and another player coming from the winners bracket after losing.  */
interface EvenLoserMatchData {
  /** Player coming from the winners bracket, or `null` if it hasn't been decided yet. */
  winnerPlayer: number | null
  /** Loser bracket match where the winner gets to play in this match. */
  loserOrigin: OddLoserMatchData
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

/** Class that handles a winner match. */
class WinnerMatch {
  left: WinnerMatch | number | null
  right: WinnerMatch | number | null
  results?: MatchResults

  constructor (left: WinnerMatch | number | null, right: WinnerMatch | number | null) {
    this.left = left
    this.right = right
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
      return new WinnerMatch(left, right)
    }
  }

  static fromData (data: WinnerMatchData): WinnerMatch {
    if ((typeof (data.left) === 'number' || data.left === null) && (typeof (data.right) === 'number' || data.right === null)) {
      return new WinnerMatch(data.left, data.right)
    } else if (isObject(data.left) && isObject(data.right)) {
      const left = WinnerMatch.fromData(data.left as WinnerMatchData)
      const right = WinnerMatch.fromData(data.right as WinnerMatchData)
      return new WinnerMatch(left, right)
    } else {
      throw new Error('Improper winner match data')
    }
  }

  getData (): WinnerMatchData {
    if (this.left instanceof WinnerMatch && this.right instanceof WinnerMatch) {
      return {
        left: this.left.getData(),
        right: this.right.getData()
      }
    } else if (this.left instanceof WinnerMatch || this.right instanceof WinnerMatch) {
      throw new Error('Improper winner match')
    } else {
      return {
        left: this.left,
        right: this.right
      }
    }
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
}

// class has no logic. Might be able to use just the interface
class StarterLoserMatch {
  left: number | null
  right: number | null

  constructor () {
    this.left = null
    this.right = null
  }

  getData (): StarterLoserMatchData {
    return {
      left: this.left,
      right: this.right
    }
  }

  static fromData (data: StarterLoserMatchData): StarterLoserMatch {
    const match = new StarterLoserMatch()
    match.left = data.left
    match.right = data.right
    return match
  }
}

class EvenLoserMatch {
  winnerPlayer: number | null
  loserOrigin: OddLoserMatch

  constructor (loserOrigin: OddLoserMatch) {
    this.winnerPlayer = null
    this.loserOrigin = loserOrigin
  }

  /** Creates children matches assuming that this is a match in the given round of the losers bracket. */
  static fromRound (round: number): EvenLoserMatch {
    if (round % 2 === 1) {
      throw new Error('Must be even.')
    }
    return new EvenLoserMatch(OddLoserMatch.fromRound(round - 1))
  }

  static fromData (data: EvenLoserMatchData): EvenLoserMatch {
    const loserOrigin = OddLoserMatch.fromData(data.loserOrigin)
    const match = new EvenLoserMatch(loserOrigin)
    match.winnerPlayer = data.winnerPlayer
    return match
  }

  getData (): EvenLoserMatchData {
    return {
      winnerPlayer: this.winnerPlayer,
      loserOrigin: this.loserOrigin.getData()
    }
  }
}

class OddLoserMatch {
  left: EvenLoserMatch | StarterLoserMatch
  right: EvenLoserMatch | StarterLoserMatch

  constructor (left: EvenLoserMatch | StarterLoserMatch, right: EvenLoserMatch | StarterLoserMatch) {
    this.left = left
    this.right = right
  }

  /** Create a match for the given round, with appropriate children matches */
  static fromRound (round: number): OddLoserMatch {
    if (round % 2 === 0) {
      throw new Error('Must be odd.')
    }
    if (round === 1) {
      const left = new StarterLoserMatch()
      const right = new StarterLoserMatch()
      return new OddLoserMatch(left, right)
    } else {
      const left = EvenLoserMatch.fromRound(round - 1)
      const right = EvenLoserMatch.fromRound(round - 1)
      return new OddLoserMatch(left, right)
    }
  }

  static fromData (data: OddLoserMatchData): OddLoserMatch {
    let left
    let right
    if ((data.left as any).winnerPlayer === undefined) {
      left = StarterLoserMatch.fromData(data.left as StarterLoserMatch)
      right = StarterLoserMatch.fromData(data.right as StarterLoserMatch)
    } else {
      left = EvenLoserMatch.fromData(data.left as EvenLoserMatchData)
      right = EvenLoserMatch.fromData(data.right as EvenLoserMatchData)
    }
    return new OddLoserMatch(left, right)
  }

  getData (): OddLoserMatchData {
    return {
      left: this.left.getData(),
      right: this.left.getData()
    }
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
}

/** Class for an ongoing tournament of Card-Jitsu */
export default class NormalTournament extends Tournament {
  winnersBracket: WinnerBracket
  losersBracket: LoserBracket
  grandFinals: GrandFinals = { winnerBracketPlayer: null, loserBracketPlayer: null }

  constructor (value: any) {
    super(value)
    if (Array.isArray(value)) {
      const tournamentPlayers = new NormalTournamentPlayers(this.players)
      this.winnersBracket = WinnerBracket.fromPlayers(tournamentPlayers)
      this.losersBracket = LoserBracket.fromSize(tournamentPlayers.size)
    } else {
      this.winnersBracket = WinnerBracket.fromData(value.tournamentSpecific.winnersBracket)
      this.losersBracket = LoserBracket.fromData(value.tournamentSpecific.losersBracket)
      this.grandFinals = value.tournamentSpecific.grandFinals
    }
  }

  override isSpecificTournamentObject (tournamentSpecific: any): boolean {
    return true
  }

  override getSpecificData (): any {
    return {
      winnersBracket: this.winnersBracket.getData(),
      losersBracket: this.losersBracket.getData(),
      grandFinals: this.grandFinals
    }
  }

  static async createTournament (players: PlayerInfo[]): Promise<NormalTournament> {
    const tournament = new NormalTournament(players)
    await tournament.save()
    return tournament
  }
}
