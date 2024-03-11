import crypto = require('crypto')

import { WebSocket, WebSocketServer } from "ws";

/** Class that stores the information for the tournament updater websocket system */
export default class TournamentUpdater {
  /** List of socket IDs connected to watching changes. */
  viewers: string[] = []

  /** WebSocket of admin that is updating the tournament, or `undefined` if it hasn't been set */
  adminWS?: UcjWS

  /** Add a new viewer based on their socket ID. */
  addViewer (id: string): void {
    this.viewers.push(id)
  }

  /** Remove a viewer based on their socket ID. */
  removeViewer (id: string): void {
    this.viewers = this.viewers.filter(viewer => viewer !== id)
  }
}

/** Base interface for a player's info */
interface Player {
  id: string
  name: string
}

/** Class handles storing screen share information */
class ScreenShareManager {
  connectedPlayers: Player[]
  /** Websocket of admin watching the screens, or `undefined` if it hasn't been set yet */
  adminWS?: UcjWS
  /** A map of all player ids and the last time they have sent any data */
  activityData: { [id: string]: Date } = {}
  /** Interval that periodically checks if any players should be removed from the queue */
  purgeInterval: NodeJS.Timeout

  /** Reference to the websocket server */
  wss: UcjWSS

  constructor (wss: UcjWSS) {
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
    if (this.adminWS !== undefined) {
      this.adminWS.send('get-players', { players: this.getPlayers() })
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
interface WSData {
  /** Identify the type of message */
  type: string
  /** Any value */
  value: any
}

/** Wrapper class for a websocket connected from the website */
class UcjWS {
  /** Reference to actual websocket */
  ws: WebSocket

  /** Unique ID of this socket */
  id: string

  constructor (ws: WebSocket) {
    this.ws = ws
    this.id = UcjWS.generateId()
  }

  /** Send a message with a type and value */
  send (type: string, value: any) {
    this.ws.send(JSON.stringify({
      type,
      value
    }))
  }

  /** Set what the socket should do when receiving a message */
  onMessage (dataCallback: (data: WSData) => void): void {
    this.ws.on('message', (rawData) => {
      const data = JSON.parse(rawData.toString())
      dataCallback(data)
    })
  }

  /** Set what the socket should do when closing */
  onClose (callback: () => void): void {
    this.ws.on('close', callback)
  }

  /** Generate a random websocket ID */
  static generateId () {
    return crypto.randomBytes(16).toString('hex')
  }
}

/** Class for the WebSocket Server used in the UCJ server */
export class UcjWSS {
  /** Map of every available socket from their ID */
  socketMap: Map<string, UcjWS>

  /** Object that handles the players screensharing */
  screenshare: ScreenShareManager
  /** Object tht handles the player watching for updates */
  tournamentUpdater: TournamentUpdater

  /** Reference to the actual websocket server */
  wss: WebSocketServer

  constructor (wss: WebSocketServer) {
    this.wss = wss
    this.screenshare = new ScreenShareManager(this)
    this.tournamentUpdater = new TournamentUpdater()
    this.socketMap = new Map<string, UcjWS>()
  }

  /** Set up what a socket should do on connection */
  onConnection (wsFunc: (ws: UcjWS) => void): void {
    this.wss.on('connection', (ws) => {
      const streamWS = new UcjWS(ws)
      this.socketMap.set(streamWS.id, streamWS)
      wsFunc(streamWS)
    })
  }
}