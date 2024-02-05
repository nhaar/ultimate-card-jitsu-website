import path = require('path')
import http = require('http')

import express = require('express')
import { Request, Response } from 'express'
import cors = require('cors')
import { Server } from 'socket.io'

import Database from './database/database'
import api from './api/api'
import ScreenShareManager from './screenshare/screenshare'
import User from './database/user'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

if (process.env.NODE_ENV === 'dev') {
  app.use(cors())
} else {
  app.use(express.static(path.join(__dirname, '../public')))
}

app.use('/api', api)

app.use('/*', (req: Request, res: Response) => {
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

const screenshare = new ScreenShareManager(sendPlayersToAdmin)

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
  socket.on('connectAdmin', ({ token }) => {
    void User.getUserByToken(token).then(user => {
      if (user !== null) {
        void user.isAdmin().then((isAdmin) => {
          if (isAdmin) {
            adminId = socket.id
            sendPlayersToAdmin()
          }
        })
      }
    })
  })
})

const db = new Database()
db.initTables()

const PORT = 5000

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
