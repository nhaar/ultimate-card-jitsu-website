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

app.use('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

const screenshare = new ScreenShareManager()

io.on('connection', (socket) => {
  socket.emit('me', socket.id)
  socket.on('disconnect', () => {
    socket.broadcast.emit('callEnded')
    screenshare.removePlayer(socket.id)
  })
  socket.on('callUser', ({ userToCall, signalData, from, name}) => {
    io.to(userToCall).emit('callUser', { signal: signalData, from: socket.id, name })
  })
  socket.on('answerCall', (data) => {
    io.to(data.to).emit('callAccepted', data.signal)
  })
  socket.on('getCalled', ({ userToCall, from }) => {
    io.to(userToCall).emit('receiveCallRequest', { from })
  })
  socket.on('requestToCall', ({ other }) => {
    io.to(other).emit('receiveRequestToCall', { idToCall: socket.id })
  })
  socket.on('connectPlayer', () => {
    screenshare.addPlayer({ id: socket.id })
  })
  socket.on('connectAdmin', ({ token }) => {
    User.getUserByToken(token).then(user => {
      if (user !== null) {
        user.isAdmin().then(isAdmin => {
          screenshare.adminId = socket.id
          io.to(socket.id).emit('getPlayers', { players: screenshare.getPlayers() })
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
