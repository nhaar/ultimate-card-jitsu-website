import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import config from './config.json'

import './styles/video-styles.css'
import { formatCookies } from './utils'
import VideoPlayer, { CropInfo, VideoCache } from './VideoPlayer'

interface PlayerInfo {
  id: string
  name: string
}

/** A map of all players and their respective crop */
interface PlayerCrops {
  [name: string]: CropInfo
}

/** Component that handles the admin page */
export default function PlayerWatchPage (): JSX.Element {
  /** WebSocket connection */
  const [socket, setSocket] = useState<Socket | null>(null)
  const [players, setPlayers] = useState<PlayerInfo[]>([])

  /** To keep track of the players sent by backend */
  const [incomingPlayers, setIncomingPlayers] = useState<PlayerInfo[]>([])

  /** Players that are not queued for video preview */
  const [unqueuedPlayers, setUnqueuedPlayers] = useState<PlayerInfo[]>([])

  /** Players queued for video preview */
  const [queuedPlayers, setQueuedPlayers] = useState<PlayerInfo[]>([])

  /** Player that has the main video preview occupied */
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null)

  // saving blob cache
  const [videoCache, setVideoCache] = useState<VideoCache>({})

  // related to cropping player videos (editting video size)
  /** Keeps crop of current selected player while being editted */
  const [currentCrop, setCurrentCrop] = useState<CropInfo | null>(null)
  /** To store all player crops locally */
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
    const socket = io(config.SERVER_URL)
    setSocket(socket)

    const token = formatCookies(document.cookie).token
    socket.emit('connectAdmin', { token })

    // set the new players, used so we can handle the actual updating with react properly
    socket.on('getPlayers', ({ players: incomingPlayers }: { players: PlayerInfo[] }) => {
      setIncomingPlayers(incomingPlayers)
    })
  }, [])

  // update players when new ones are received
  useEffect(() => {
    const u = [...unqueuedPlayers]
    const q = [...queuedPlayers]

    const removedPlayers: PlayerInfo[] = []

    // add new players to unqueued
    for (const player of incomingPlayers) {
      if (players.find((p) => p.id === player.id) == null) {
        u.push(player)
      }
    }
    // find players that have been removed
    for (const player of players) {
      if (incomingPlayers.find((p) => p.id === player.id) == null) {
        removedPlayers.push(player)
      }
    }

    updatePlayersInQueue(u, removedPlayers)
    updatePlayersInQueue(q, removedPlayers)
    setUnqueuedPlayers(u)
    setQueuedPlayers(q)

    // unselecting player if it was removed
    if (selectedPlayer !== null && (removedPlayers.find((p) => p.id === selectedPlayer.id) !== undefined)) {
      unselectPlayer()
    }
    setPlayers(incomingPlayers)
  }, [incomingPlayers])

  function addToQueue (id: string): void {
    const u = [...unqueuedPlayers]
    const unqueueIndex = u.findIndex((p) => p.id === id)
    const player = u[unqueueIndex]
    u.splice(unqueueIndex, 1)
    setQueuedPlayers([...queuedPlayers, player])
    setUnqueuedPlayers(u)
  }

  /**
   * Makes a player selected in the main screen
   * @param player Player to select
   */
  function selectPlayer (player: PlayerInfo): void {
    // to remove from queue
    const q = [...queuedPlayers]
    const queuedIndex = q.findIndex((p) => p.id === player.id)
    if (queuedIndex !== -1) {
      q.splice(queuedIndex, 1)
    }

    // to requeue previous selected
    const previousPlayer = selectedPlayer
    if (previousPlayer !== null) {
      q.push(previousPlayer)
    }

    // to be able to edit the selected player's crop
    setCurrentCrop(playerCrops[player.name] ?? { left: 0, right: 0, top: 0, bottom: 0 })

    setSelectedPlayer(player)
    setQueuedPlayers(q)
  }

  /** Unselects the main video preview */
  function unselectPlayer (): void {
    setSelectedPlayer(null)
  }

  /** The components that are responsible for changing the crop values (for the selected player) */
  const cropComponents = []

  // to dynamically create the crop inputs
  if (currentCrop !== null) {
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
  }

  // saving the crop for selected player when changing
  useEffect(() => {
    if (selectedPlayer !== null && currentCrop !== null) {
      setPlayerCrops({ ...playerCrops, [selectedPlayer.name]: currentCrop })
    }
  }, [currentCrop])

  // keeping video 16:10 (roughyl Club Penguin's aspect ratio)
  const videoWidth = 900
  const videoHeight = videoWidth * 10 / 16

  // element with the main video, is what should be placed on stream
  // has to have fixed size for that reason
  const mainVideo = selectedPlayer === null
    ? (
      <div style={{
        width: `${videoWidth}px`,
        height: `${videoHeight}px`,
        backgroundColor: '#169cf7',
        color: 'black',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      >Waiting for streams...
      </div>
      )
    : (
      <VideoPlayer key={selectedPlayer?.id} socket={socket} socketId={selectedPlayer?.id ?? ''} width={videoWidth} height={videoHeight} cropInfo={selectedPlayer !== null ? playerCrops[selectedPlayer.name] : undefined} videoCache={videoCache} setVideoCache={setVideoCache} />
      )

  return (
    <div className='is-flex is-flex-direction-row'>
      <div>
        {mainVideo}
      </div>
      <div
        className='is-flex is-flex-direction-row has-text-primary' style={{
          overflow: 'scroll'
        }}
      >
        <div>
          QUEUED PLAYERS
          {queuedPlayers.map((player) => {
            return (
              <div key={player.id}>
                <button onClick={() => selectPlayer(player)}>SELECT: {player.name}</button>
                <VideoPlayer key={player.id} socket={socket} socketId={player.id} width={200} height={200} videoCache={videoCache} setVideoCache={setVideoCache} />
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
        <div>
          {cropComponents}
        </div>
      </div>
    </div>
  )
}
