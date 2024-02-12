import { io, Socket } from 'socket.io-client'
import { useEffect, useState } from 'react'
import { SERVER_URL } from './urls'
import { formatCookies, getCookie } from './utils'

/** Page where the players can share screen */
function ScreensharePage (): JSX.Element {
  /** WebSocket connection as a player */
  const [socket, setSocket] = useState<Socket | null>(null)
  /** WebSocket id that will be used to identify this player */
  const [me, setMe] = useState<string>('')

  /**
   * Creates a media recorder that will send video chunks to the backend every 5 seconds
   * @param stream
   */
  function createMediaRecorder (stream: MediaStream): void {
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        socket?.emit('message', { blob: e.data, type: e.data.type, id: me })
      }
      mediaRecorder.stop()
      // because of how MediaRecorder works, the only way to have a readable video chunk is to record
      // so recursively create new and disable old one.
      mediaRecorder.ondataavailable = null
      createMediaRecorder(stream)
    }
    mediaRecorder.start(5000)
  }

  /**
   * Starts sharing screen to backend
   */
  function startScreensharing (): void {
    void navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then((stream) => {
      createMediaRecorder(stream)
    })
    const name = formatCookies(document.cookie).name
    socket?.emit('screenshare', { name, id: me })
  }

  // connecting socket
  useEffect(() => {
    const socket = io(SERVER_URL)

    // this is for receiving the id from the backend
    socket.on('me', ({ id }) => {
      setMe(id)
    })

    // this is to signal that we are connecting and we want to get the ID (the socket will often reconnect and change ID so we only get it the first time)
    socket.emit('me')
    setSocket(socket)
  }, [])

  return (
    <div>
      <button onClick={startScreensharing}>share</button>
    </div>
  )
}

/** Page where users can edit their profile */
function EditProfilePage (): JSX.Element {
  return (
    <div>Hello Profile</div>
  )
}

/**
 * Handles the page where non admin players can perform actions. Not to be confused with PlayerPage which handles all types of users
 */
export default function UserPage (): JSX.Element {
  const username = getCookie('name') ?? 'Player'
  const urlParams = new URLSearchParams(window.location.search)
  const pageType = urlParams.get('p')
  switch (pageType) {
    case 'e':
      return <EditProfilePage />
    case 's':
      return <ScreensharePage />
  }

  return (
    <div>
      <div>
        Welcome, {username}! This is your page, here's what you can do:
      </div>
      <div><a href='/player?p=e'>Edit your profile</a></div>
      <div><a href='/player?p=s'>Go screenshare, so that you can be on stream</a></div>
    </div>
  )
}
