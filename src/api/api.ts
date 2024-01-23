import express = require('express')

import userApi from './user-api'
import tournamentApi from './tournament-api'

const router = express.Router()

router.use(express.json())
router.use('/user', userApi)
router.use('/tournament', tournamentApi)

export default router
