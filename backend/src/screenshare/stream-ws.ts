import crypto = require('crypto')

import { WebSocket, WebSocketServer } from "ws";

/** Base interface for a player's info */
interface Player {
  id: string
  name: string
}

/** Class handles storing screen share information */
class ScreenShareManager {
  connectedPlayers: Player[]
  adminId: string | null = null
  /** A map of all player ids and the last time they have sent any data */
  activityData: { [id: string]: Date } = {}
  /** Interval that periodically checks if any players should be removed from the queue */
  purgeInterval: NodeJS.Timeout

  wss: StreamWSS

  constructor (wss: StreamWSS) {
    this.wss = wss
    this.connectedPlayers = []
    this.purgeInterval = setInterval(() => {
      if (this.removeInactivePlayers()) {
        this.sendPlayersToAdmin()
      }
    }, 10000)
  }

  /** Send all players to the admin watching the screens */
  sendPlayersToAdmin () {
    if (this.wss.adminWS !== undefined) {
      this.wss.adminWS.send('get-players', { players: this.getPlayers() })
    }
  }

  addPlayer (id: string, name: string): void {
    this.connectedPlayers.push({ id, name })
  }

  getPlayers (): Player[] {
    return this.connectedPlayers
  }

  removePlayer (id: string): void {
    this.connectedPlayers = this.connectedPlayers.filter(player => player.id !== id)
  }

  updatePlayerActivity (id: string): void {
    this.activityData[id] = new Date()
  }

  /**
   * Removes all inactive players
   * @returns `true` if any players were removed
   */
  removeInactivePlayers (): boolean {
    const now = new Date()
    const inactivePlayers = Object.keys(this.activityData).filter(id => {
      const lastActivity = this.activityData[id]
      const diff = now.getTime() - lastActivity.getTime()
      return diff > 10000
    })
    const playerCount = this.connectedPlayers.length
    inactivePlayers.forEach(id => {
      this.removePlayer(id)
    })

    return playerCount !== this.connectedPlayers.length
  }
}

/** Object is how every data should look like when passing through the websocket */
interface StreamWSData {
  /** Identify the type of message */
  type: string
  /** Any value */
  value: any
}

/** Class for a websocket connected in the screensharing system */
class StreamWS {
  /** Reference to actual websocket */
  ws: WebSocket

  constructor (ws: WebSocket) {
    this.ws = ws
  }

  /** Send a message with a type and value */
  send (type: string, value: any) {
    this.ws.send(JSON.stringify({
      type,
      value
    }))
  }

  /** Set what the socket should do when receiving a message */
  onMessage (dataCallback: (data: StreamWSData) => void): void {
    this.ws.on('message', (rawData) => {
      const data = JSON.parse(rawData.toString())
      dataCallback(data)
    })
  }
}

/** Class for the WebSocket Server responsible for handling the screensharing websockets */
export class StreamWSS {
  /** Websocket of the admin watching screens, or `undefined` if not set yet */
  adminWS?: StreamWS
  /** Object that handles the players screensharing */
  screenshare: ScreenShareManager
  /** Reference to the actual websocket server */
  wss: WebSocketServer

  constructor (wss: WebSocketServer) {
    this.wss = wss
    this.screenshare = new ScreenShareManager(this)
  }

  /** Set up what a socket should do on connection */
  onConnection (wsFunc: (ws: StreamWS) => void): void {
    this.wss.on('connection', (ws) => {
      const streamWS = new StreamWS(ws)
      wsFunc(streamWS)
    })
  }

  /** Generate a random websocket ID */
  static generateId () {
    return crypto.randomBytes(16).toString('hex')
  }
}