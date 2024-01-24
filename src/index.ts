import path = require('path')
import http = require('http')

import express = require('express')
import { Request, Response } from 'express'
import cors = require('cors')
import { Server } from 'socket.io'

import Database from './database/database'
import api from './api/api'

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

io.on('connection', (socket) => {
  socket.emit('me', socket.id)
  socket.on('disconnect', () => {
    socket.broadcast.emit('callEnded')
  })
  socket.on('callUser', ({ userToCall, signalData, from, name}) => {
    io.to(userToCall).emit('callUser', { signal: signalData, from, name })
  })
  socket.on('answerCall', (data) => {
    io.to(data.to).emit('callAccepted', data.signal)
  })
})

const db = new Database()
db.initTables()

const PORT = 5000

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
