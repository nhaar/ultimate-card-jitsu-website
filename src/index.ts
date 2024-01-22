import path = require('path')

import express = require('express')
import { Request, Response } from 'express'
import cors = require('cors')

import api from './api/api'

const app = express()

if (process.env.NODE_ENV === 'dev') {
  app.use(cors())
} else {
  app.use(express.static(path.join(__dirname, '../public')))
}

app.use('/api', api)

app.use('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})
