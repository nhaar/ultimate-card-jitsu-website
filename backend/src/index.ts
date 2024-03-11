import path = require('path')
import http = require('http')

import express = require('express')
import { Request, Response } from 'express'
import cors = require('cors')
import { WebSocketServer } from 'ws'

import Database from './database/database'
import api from './api/api'
import User from './database/user'
import { UcjWSS } from './websockets/ucj-ws'

const app = express()
const server = http.createServer(app)

app.use(cors())
app.use(express.static(path.join(__dirname, '../public')))

app.use('/api', api)

app.use('/*', (_: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

const wss = new UcjWSS(new WebSocketServer({ server }))

wss.onConnection((ws) => {
  ws.send('me', ws.id)

  ws.onMessage((data) => {
    switch (data.type) {
      /** In this event, the frontend sends a blob object (encoded), and here we direct it to the admin's socket. */
      case 'stream-data': {
        wss.screenshare.updatePlayerActivity(data.value.id)
        if (wss.screenshare.adminWS !== undefined) {
          wss.screenshare.adminWS.send('stream-data', data.value)
        }
        break
      }
      /** Frontend sends request to connect new admin, with authorization token in the body. */
      case 'connect-admin': {
        void User.getUserByToken(data.value).then(user => {
          void user?.isAdmin().then(isAdmin => {
            if (isAdmin) {
              wss.screenshare.adminWS = ws
              wss.screenshare.sendPlayersToAdmin()
            }
          })
        })
        break
      }
      /** Frontend connects player's screen */
      case 'screenshare': {
        wss.screenshare.addPlayer(data.value.id, data.value.name)
        wss.screenshare.sendPlayersToAdmin()
        break
      }
      /** Tournament control admin sending new information of the tournament */
      case 'update-tournament': {
        if (wss.tournamentUpdater.adminWS !== undefined) {
          for (const viewer of wss.tournamentUpdater.viewers) {
            const viewerWS = wss.socketMap.get(viewer)
            viewerWS?.send('update-tournament', data.value)
          }
        }
        break
      }
      /** Tournament control admin sending request to be able to send updates */
      case 'connect-updater': {
        void User.getUserByToken(data.value).then(user => {
          void user?.isAdmin().then(isAdmin => {
            if (isAdmin) {
              wss.tournamentUpdater.adminWS = ws
            }
          })
        })
        break
      }
      /** Main page sending request to receive updates */
      case 'watch-tournament': {
        wss.tournamentUpdater.addViewer(ws.id)
        break
      }
    }
  })

  ws.onClose(() => {
    wss.tournamentUpdater.removeViewer(ws.id)
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
