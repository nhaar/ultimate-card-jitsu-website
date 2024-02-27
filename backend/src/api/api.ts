import express = require('express')

import userApi from './user-api'
import tournamentApi from './tournament-api'

const router = express.Router()

// big limit to accept images in base64
router.use(express.json({ limit: '200mb' }))
router.use('/user', userApi)
router.use('/tournament', tournamentApi)

export default router
