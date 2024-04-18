import fs = require('fs')
import path = require('path')

import axios from 'axios'

import config from './config'

/** Get phase from the backend */
async function getPhase (): Promise<string> {
  const response = await axios.get(config.SERVER_URL + 'api/tournament/get-display-phase')
  return response.data.phase
}

/** Get players in battle from backend (only for UCJ) */
async function getBattleInfo (): Promise<[string, string]> {
  const response = await axios.get(config.SERVER_URL + 'api/tournament/obs-battle-info', {
    validateStatus: () => true
  })
  if (typeof response.data === 'string') {
    return ['', '']
  } else {
    return [response.data.player1, response.data.player2]
  }
}

/** Filters a name for how it should be visible */
function parseName(name: string): string {
  const MAX_LENGTH = 10
  if (name.length > MAX_LENGTH) {
    return name.slice(0, MAX_LENGTH - 1) + '...'
  } else {
    return name
  }
}

const OUT_DIR = path.join(__dirname, '../out')

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR)
}

/** Saves text data in an output file */
function savePhaseOutput (name: string, data: string): void {
  fs.writeFileSync(path.join(OUT_DIR, `${name}.txt`), data)
}

/** Saves the players in battle */
function saveBattleOutput (player1: string, player2: string): void {
  fs.writeFileSync(path.join(OUT_DIR, 'player1.txt'), parseName(player1))
  fs.writeFileSync(path.join(OUT_DIR, 'player2.txt'), parseName(player2))
}

/** Main function of the helper which is constantly looped */
function loop (): void {
  void (async () => {
    savePhaseOutput('phase', await getPhase())
    saveBattleOutput(...await getBattleInfo())
  })()
}

setInterval(loop, 5000)
