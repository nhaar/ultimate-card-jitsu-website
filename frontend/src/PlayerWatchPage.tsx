import { useEffect, useRef, useState } from 'react'

import './styles/video-styles.css'
import FoldImage from './images/fold.png'
import { formatCookies } from './utils'
import VideoPlayer, { CropInfo, VideoCache } from './VideoPlayer'
import { UcjWS } from './ws'

interface PlayerInfo {
  id: string
  name: string
}

/** A map of all players and their respective crop */
interface PlayerCrops {
  [name: string]: CropInfo
}

/** Data for drawing the fold. Remember that the fold is just a rectangle */
interface FoldData {
  /** Whether the fold should be visible or not */
  visible: boolean
  /** Scale relative to the original image size */
  scale: string
  /** Number between 0 to 1 representing how far from the left the fold is within the video */
  left: string
  /** Number between 0 to 1 representing how far from the top the fold is within the video */
  top: string
}

/** Name for the local storage variable that stores crop data */
const LOCAL_CROP_DATA = 'cropData'

/** Component that handles the admin page */
export default function PlayerWatchPage (): JSX.Element {
  /** WebSocket connection */
  const [socket] = useState<UcjWS>(() => {
    const socket = new UcjWS()

    const token = formatCookies(document.cookie).token

    socket.onOpen(() => {
      socket.send('connect-admin', token)
    })

    socket.onMessage((data) => {
      if (data.type === 'get-players') {
        setIncomingPlayers(data.value.players)
      }
    })

    return socket
  })
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
  const [playerCrops, setPlayerCrops] = useState<PlayerCrops>(() => {
    const localCrops = localStorage.getItem(LOCAL_CROP_DATA)
    if (localCrops !== null) {
      return JSON.parse(localCrops)
    }

    return {}
  })

  /** Store all fold information */
  const [foldData, setFoldData] = useState<FoldData>({
    visible: false,
    scale: '1',
    top: '0',
    left: '0'
  })

  /** Ref to the image element containing fold */
  const foldRef = useRef<HTMLImageElement>(null)

  /** The base fold width, or undefined if it hasn't been calculated yet */
  const [foldWidth, setFoldWidth] = useState<number | undefined>(undefined)

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

  /** Remove a player from the queue */
  function removeFromQueue (id: string): void {
    const u = [...unqueuedPlayers]
    const q = [...queuedPlayers]
    const removingIndex = q.findIndex(p => p.id === id)
    u.push(q[removingIndex])
    q.splice(removingIndex, 1)
    setQueuedPlayers(q)
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
      const p = { ...playerCrops, [selectedPlayer.name]: currentCrop }
      setPlayerCrops(p)
      localStorage.setItem(LOCAL_CROP_DATA, JSON.stringify(p))
    }
  }, [currentCrop])

  // keeping video 16:10 (roughyl Club Penguin's aspect ratio)
  const videoWidth = 900
  const videoHeight = videoWidth * 10 / 16

  // element with the main video, is what should be placed on stream
  // has to have fixed size for that reason
  const mainVideo = selectedPlayer === null
    ? (
      <div
        className='burbank' style={{
          width: `${videoWidth}px`,
          height: `${videoHeight}px`,
          backgroundColor: '#169cf7',
          color: 'black',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '24pt'
        }}
      >Waiting for streams...
      </div>
      )
    : (
      <VideoPlayer key={selectedPlayer?.id} socket={socket} socketId={selectedPlayer?.id ?? ''} width={videoWidth} height={videoHeight} cropInfo={selectedPlayer !== null ? playerCrops[selectedPlayer.name] : undefined} videoCache={videoCache} setVideoCache={setVideoCache} />
      )

  /** Helper function that converts a number to a percentage in string format */
  function toPercentageString (value: number): string {
    if (isNaN(value)) {
      return '0%'
    }
    return String(value * 100) + '%'
  }

  /** Style applied to the fold's image lement */
  const foldStyle: React.CSSProperties = {
    position: 'absolute',
    top: toPercentageString(Number(foldData.top)),
    left: toPercentageString(Number(foldData.left)),
    width: foldWidth === undefined ? undefined : Number(foldData.scale) * foldWidth,
    display: foldData.visible ? undefined : 'none'
  }

  // used to calculate the fold image width whenever the reference is captured
  useEffect(() => {
    if (foldRef.current !== null) {
      setFoldWidth(foldRef.current.naturalWidth)
    }
  }, [foldRef])

  return (
    <div className='is-flex is-flex-direction-row'>
      <div className='is-relative'>
        <img ref={foldRef} style={foldStyle} src={FoldImage} />
        {mainVideo}
      </div>
      <div
        className='is-flex is-flex-direction-row has-text-primary' style={{
          overflow: 'scroll',
          maxHeight: '90vh'
        }}
      >
        <div>
          <span
            className='burbank' style={{
              color: '#FFF',
              padding: '2%'
            }}
          >QUEUED PLAYERS
          </span>
          {queuedPlayers.map((player) => {
            return (
              <div key={player.id}>
                <button onClick={() => selectPlayer(player)}>SELECT: {player.name}</button>
                <button onClick={() => removeFromQueue(player.id)}>UNQUEUE</button>
                <VideoPlayer key={player.id} socket={socket} socketId={player.id} width={100} height={100} videoCache={videoCache} setVideoCache={setVideoCache} />
              </div>
            )
          })}
        </div>
        <div>
          <span
            className='burbank' style={{
              color: '#FFF',
              padding: '2%'
            }}
          >UNQUEUED PLAYERS
          </span>
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
        {/* fold components below */}
        <div>
          <div>
            <span>fold-visible</span>
            <input type='checkbox' checked={foldData.visible} onChange={e => setFoldData(f => ({ ...f, visible: e.target.checked }))} />
          </div>
          <div>
            <span>fold-scale</span>
            <input type='number' value={foldData.scale} onChange={e => setFoldData(f => ({ ...f, scale: e.target.value }))} />
          </div>
          <div>
            <span>fold-top</span>
            <input type='number' value={foldData.top} onChange={e => setFoldData(f => ({ ...f, top: e.target.value }))} />
          </div>
          <div>
            <span>fold-left</span>
            <input type='number' value={foldData.left} onChange={e => setFoldData(f => ({ ...f, left: e.target.value }))} />
          </div>
        </div>
      </div>
    </div>
  )
}
