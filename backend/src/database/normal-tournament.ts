import Tournament, { PlayerInfo } from './tournament'

/** Class for an ongoing tournament of Card-Jitsu */
export default class NormalTournament extends Tournament {
  override createFromSpecificData (specific: any): void {

  }

  override createFromPlayers (players: PlayerInfo[]): void {

  }

  override isSpecificTournamentObject (tournamentSpecific: any): boolean {
    return true
  }

  override getSpecificData (): any {
    return {}
  }

  static async createTournament (players: PlayerInfo[]): Promise<NormalTournament> {
    const tournament = new NormalTournament(players)
    await tournament.save()
    return tournament
  }
}
