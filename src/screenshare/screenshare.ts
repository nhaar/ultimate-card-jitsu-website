/** Base interface for a player's info */
interface Player {
  id: string
}

/** Class handles storing screen share information */
export default class ScreenShareManager {
  connectedPlayers: Player[]
  adminId: string | null = null
  
  constructor () {
    this.connectedPlayers = []
  }

  addPlayer (player: Player) {
    this.connectedPlayers.push(player)
  }

  getPlayers(): Player[] {
    return this.connectedPlayers
  }

  removePlayer(id: string) {
    this.connectedPlayers = this.connectedPlayers.filter(player => player.id !== id)
  }
}