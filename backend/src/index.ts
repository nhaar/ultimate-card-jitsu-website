import path = require('path')
import http = require('http')

import express = require('express')
import { Request, Response } from 'express'
import cors = require('cors')
import { Server, Socket } from 'socket.io'

import Database from './database/database'
import api from './api/api'
import ScreenShareManager from './screenshare/screenshare'
import User from './database/user'
import TournamentUpdater from './tournament-updater/tournament-updater'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.static(path.join(__dirname, '../public')))

app.use('/api', api)

app.use('/*', (_: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

/** Socket ID of connected admin, which is the target for receiving videos. Only one at a time. */
let adminId: string

/** Sends all new players to the admin connected to the socket, if any */
function sendPlayersToAdmin (): void {
  if (adminId !== undefined) {
    io.to(adminId).emit('getPlayers', { players: screenshare.getPlayers() })
  }
}

// similarities between both manager and updater seem too much, might need to refactor
const screenshare = new ScreenShareManager(sendPlayersToAdmin)
const tournamentUpdater = new TournamentUpdater()

/**
 * Creates a socket response function that will only run an action if the socket provides a valid admin user token.
 * @param callback Function that takes as the first parameter the socket that is emitting, and as the second parameter the user object of the admin.
 */
function adminOnlySocketResponse (socket: Socket, callback: ((socket: Socket, user: User) => void)): (({ token }: { token: string }) => void) {
  return ({ token }) => {
    void User.getUserByToken(token).then(user => {
      if (user !== null) {
        void user.isAdmin().then((isAdmin) => {
          if (isAdmin) {
            callback(socket, user)
          }
        })
      }
    })
  }
}

io.on('connection', (socket) => {
  // currently there seems to be an unstability? Need to check if this is because of sockets in the same computer.
  console.log('CONNECTING ', socket.id)

  // When the frontend is sending a request to get their ID, we send it back to them.
  socket.on('me', () => {
    io.to(socket.id).emit('me', { id: socket.id })
  })

  /** In this event, the frontend sends a blob object, and here we direct it to the admin's socket. */
  socket.on('message', (data) => {
    screenshare.updatePlayerActivity(data.id)
    if (adminId !== undefined) {
      io.to(adminId).emit('message', data)
    }
  })

  /** Frontend connects player's screen */
  socket.on('screenshare', ({ name, id }) => {
    screenshare.addPlayer(id, name)
    sendPlayersToAdmin()
  })

  /** Frontend sends request to connect new admin, with authorization token in the body. */
  socket.on('connectAdmin', adminOnlySocketResponse(socket, (socket) => {
    adminId = socket.id
    sendPlayersToAdmin()
  }))

  /** Main page sending request to receive updates */
  socket.on('watchTournament', () => {
    tournamentUpdater.addViewer(socket.id)
  })

  /** Tournament control admin sending request to be able to send updates */
  socket.on('connectUpdater', adminOnlySocketResponse(socket, (socket) => {
    tournamentUpdater.adminId = socket.id
  }))

  /** Tournament control admin sending new information of the tournament */
  socket.on('updateTournament', (data) => {
    if (socket.id === tournamentUpdater.adminId) {
      for (const viewer of tournamentUpdater.viewers) {
        io.to(viewer).emit('updateTournament', data)
      }
    }
  })

  socket.on('disconnect', () => {
    tournamentUpdater.removeViewer(socket.id)
  })
})

// initiatilizing database: create tables, and then add admin user if it doesn't exist
const db = new Database()
db.initTables().then(() => {
  void User.createAdmin()
}, () => {
  console.error('Failed to initialize database')
})

const PORT = process.env.NODE_ENV === 'production' ? 80 : 5000

console.log(process.env.NODE_ENV)

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
