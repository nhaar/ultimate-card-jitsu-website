import express = require('express')

import userApi from './user-api'

const router = express.Router()

router.use(express.json())
router.use('/user', userApi)

export default router
