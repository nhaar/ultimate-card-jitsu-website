import path = require('path')
import http = require('http')

import express = require('express')
import { Request, Response } from 'express'
import cors = require('cors')
import { Server, Socket } from 'socket.io'
import { WebSocketServer } from 'ws'

import Database from './database/database'
import api from './api/api'
import User from './database/user'
import TournamentUpdater from './tournament-updater/tournament-updater'
import { StreamWSS } from './screenshare/stream-ws'

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

// similarities between both manager and updater seem too much, might need to refactor
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
  console.log('SOCKET.IO CONNECTED ', socket.id)

  // When the frontend is sending a request to get their ID, we send it back to them.
  socket.on('me', () => {
    io.to(socket.id).emit('me', { id: socket.id })
  })

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

const wss = new StreamWSS(new WebSocketServer({ server }))

wss.onConnection((ws) => {
  console.log('stream WS connected')

  const id = StreamWSS.generateId()
  
  ws.send('me', id)

  ws.onMessage((data) => {
    switch (data.type) {
      /** In this event, the frontend sends a blob object (encoded), and here we direct it to the admin's socket. */
      case 'stream-data': {
        wss.screenshare.updatePlayerActivity(data.value.id)
        if (wss.adminWS !== undefined) {
          wss.adminWS.send('stream-data', data.value)
        }
        break
      }
    /** Frontend sends request to connect new admin, with authorization token in the body. */
      case 'connect-admin': {
        void User.getUserByToken(data.value).then(user => {
          void user?.isAdmin().then(isAdmin => {
            if (isAdmin) {
              wss.adminWS = ws
              wss.screenshare.sendPlayersToAdmin()
            }
          })
        })
      }
      /** Frontend connects player's screen */
      case 'screenshare': {
        wss.screenshare.addPlayer(data.value.id, data.value.name)
        wss.screenshare.sendPlayersToAdmin()
        break
      }
    }
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

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
