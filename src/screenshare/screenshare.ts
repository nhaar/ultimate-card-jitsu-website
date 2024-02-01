/** Base interface for a player's info */
interface Player {
  id: string
  name: string
}

/** Class handles storing screen share information */
export default class ScreenShareManager {
  connectedPlayers: Player[]
  adminId: string | null = null
  /** A map of all player ids and the last time they have sent any data */
  activityData: { [id: string]: Date } = {}
  /** Interval that periodically checks if any players should be removed from the queue */
  purgeInterval: NodeJS.Timeout
  
  constructor (sendPlayersToAdmin: () => void) {
    this.connectedPlayers = []
    this.purgeInterval = setInterval(() => {
      if (this.removeInactivePlayers()) {
        sendPlayersToAdmin()
      }
    }, 10000)
  }

  addPlayer (id: string, name: string) {
    this.connectedPlayers.push({ id, name })
  }

  getPlayers(): Player[] {
    return this.connectedPlayers
  }

  removePlayer(id: string) {
    this.connectedPlayers = this.connectedPlayers.filter(player => player.id !== id)
  }

  updatePlayerActivity(id: string) {
    this.activityData[id] = new Date()
  }

  /**
   * Removes all inactive players
   * @returns `true` if any players were removed
   */
  removeInactivePlayers(): boolean {
    const now = new Date()
    const inactivePlayers = Object.keys(this.activityData).filter(id => {
      const lastActivity = this.activityData[id]
      const diff = now.getTime() - lastActivity.getTime()
      return diff > 10000
    })
    const playerCount = this.connectedPlayers.length
    inactivePlayers.forEach(id => {
      this.removePlayer(id)
      delete this.activityData[id]
    })

    return playerCount !== this.connectedPlayers.length
  }
}