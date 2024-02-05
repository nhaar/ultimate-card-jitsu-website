import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { SERVER_URL } from './urls'

import './styles/video-styles.css'
import { formatCookies } from './utils'
import VideoPlayer, { CropInfo } from './VideoPlayer'

interface PlayerInfo {
  id: string
  name: string
}

/** A map of all players and their respective crop */
interface PlayerCrops {
  [id: string]: CropInfo
}

/** Component that handles the admin page */
export default function AdminPage (): JSX.Element {
  /** WebSocket connection */
  const [socket, setSocket] = useState<Socket | null>(null)
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [unqueuedPlayers, setUnqueuedPlayers] = useState<PlayerInfo[]>([])
  const [queuedPlayers, setQueuedPlayerds] = useState<PlayerInfo[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null)

  // related to crop mode (editting video size)
  const [cropMode, setCropMode] = useState(false)
  const [currentCrop, setCurrentCrop] = useState({ left: 0, right: 0, top: 0, bottom: 0 })
  const [playerCrops, setPlayerCrops] = useState<PlayerCrops>({})

  /**
   * Remove all players from a queue if they were in it, mutates the given array
   * @param originalQueue Queue with the players
   * @param removedPlayers List of players that were removed (and may be in the queue)
   */
  function updatePlayersInQueue (originalQueue: PlayerInfo[], removedPlayers: PlayerInfo[]): void {
    for (const player of removedPlayers) {
      const index = originalQueue.findIndex((p) => p.id === player.id)
      if (index !== -1) {
        originalQueue.splice(index, 1)
      }
    }
  }

  // connect socket as an admin to receive video chunks
  useEffect(() => {
    const socket = io(SERVER_URL)
    setSocket(socket)

    const token = formatCookies(document.cookie).token
    socket.emit('connectAdmin', { token })
    socket.on('getPlayers', ({ players: incomingPlayers }: { players: PlayerInfo[] }) => {
      const u = [...unqueuedPlayers]
      const q = [...queuedPlayers]

      const removedPlayers: PlayerInfo[] = []
      for (const player of incomingPlayers) {
        if (players.find((p) => p.id === player.id) == null) {
          u.push(player)
        }
      }
      for (const player of players) {
        if (incomingPlayers.find((p) => p.id === player.id) == null) {
          removedPlayers.push(player)
        }
      }

      updatePlayersInQueue(u, removedPlayers)
      updatePlayersInQueue(q, removedPlayers)
      setUnqueuedPlayers(u)
      setQueuedPlayerds(q)

      if (selectedPlayer !== null && (removedPlayers.find((p) => p.id === selectedPlayer.id) != null)) {
        setSelectedPlayer(null)
      }
      setPlayers(incomingPlayers)
    })
  }, [])

  function addToQueue (id: string): void {
    const u = [...unqueuedPlayers]
    const unqueueIndex = u.findIndex((p) => p.id === id)
    const player = u[unqueueIndex]
    u.splice(unqueueIndex, 1)
    setQueuedPlayerds([...queuedPlayers, player])
    setUnqueuedPlayers(u)
  }

  /**
   * Initiates crop mode for the currently selected player
   */
  function enterCropMode (): void {
    setCropMode(true)
    setCurrentCrop({ left: 0, right: 0, top: 0, bottom: 0 })
  }

  /**
   * Exits crop mode and saves the crop info for the currently selected player
   */
  function exitCropMode (): void {
    setCropMode(false)
    setPlayerCrops({ ...playerCrops, [selectedPlayer?.id ?? '']: currentCrop })
    console.log(playerCrops)
  }

  if (cropMode) {
    // to dynamically create the crop inputs
    const cropComponents = []
    for (const direction in currentCrop) {
      cropComponents.push(
        <div>
          <span>{direction}</span>
          <input
            type='number' value={currentCrop[direction as keyof CropInfo]} onChange={e => {
              setCurrentCrop({ ...currentCrop, [direction]: Number(e.target.value) })
            }}
          />
        </div>
      )
    }

    return (
      <div>
        {cropComponents}
        <button onClick={exitCropMode}>FINISH</button>
        {/* using arbitrarily small 16:9 ratio for preview */}
        <VideoPlayer key={selectedPlayer?.id} socket={socket} socketId={selectedPlayer?.id ?? ''} width={640} height={360} cropInfo={currentCrop} />
      </div>
    )
  }

  // keeping video 16:10 (roughyl Club Penguin's aspect ratio)
  const videoWidth = 900
  const videoHeight = videoWidth * 10 / 16

  // element with the main video, is what should be placed on stream
  // has to have fixed size for that reason
  const mainVideo = selectedPlayer === null
    ? (
      <div style={{
        width: `${videoWidth}px`,
        height: `${videoHeight}px`
      }}
      >Player will be here!
      </div>
      )
    : (
      <VideoPlayer key={selectedPlayer?.id} socket={socket} socketId={selectedPlayer?.id ?? ''} width={videoWidth} height={videoHeight} cropInfo={selectedPlayer !== null ? playerCrops[selectedPlayer.id] : undefined} />
      )

  return (
    <div className='is-flex is-flex-direction-row'>
      <div>
        {mainVideo}
      </div>
      <div
        className='is-flex is-flex-direction-row' style={{
          overflow: 'scroll'
        }}
      >
        <div>
          QUEUED PLAYERS
          {queuedPlayers.map((player) => {
            return (
              <div key={player.id}>
                <button onClick={() => setSelectedPlayer(player)}>SELECT: {player.name}</button>
                <VideoPlayer key={player.id} socket={socket} socketId={player.id} width={200} height={200} />
              </div>
            )
          })}
        </div>
        <div>
          UNQUEUED PLAYERS
          {unqueuedPlayers.map((player) => {
            return (
              <div key={player.id}>
                <button onClick={() => addToQueue(player.id)}>ADD: {player.name}</button>
              </div>
            )
          })}
        </div>
        <button onClick={enterCropMode}>ENTER CROP MODE</button>
      </div>
    </div>
  )
}
