import fs = require('fs')
import path = require('path')

import axios from 'axios'

import config from './config'

/** Get phase from the backend */
async function getPhase (): Promise<string> {
  const response = await axios.get(config.SERVER_URL + 'api/tournament/get-display-phase')
  return response.data.phase
}

/** Saves text data in an output file */
function saveOutput (name: string, data: string): void {
  const outDir = path.join(__dirname, '../out')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir)
  }
  fs.writeFileSync(path.join(outDir, `${name}.txt`), data)
}

/** Main function of the helper which is constantly looped */
function loop (): void {
  void (async () => {
    saveOutput('phase', await getPhase())
  })()
}

setInterval(loop, 5000)
