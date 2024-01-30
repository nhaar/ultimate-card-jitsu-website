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

const screenshare = new ScreenShareManager()

/** Socket ID of connected admin, which is the target for receiving videos. Only one at a time. */
let adminId: string

io.on('connection', (socket) => {
  /** In this event, the frontend sends a blob object, and here we direct it to the admin's socket. */
  socket.on('message', (data) => {
    if (adminId !== undefined) {
      const newData = Object.assign({}, data, { id: socket.id })
      io.to(adminId).emit('message', newData)
    }
  })

  /** Frontend sends request to connect new admin, with authorization token in the body. */
  socket.on('connectAdmin', ({ token }) => {
    User.getUserByToken(token).then(user => {
      if (user !== null) {
        user.isAdmin().then((isAdmin) => {
          if (isAdmin) {
            adminId = socket.id
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
