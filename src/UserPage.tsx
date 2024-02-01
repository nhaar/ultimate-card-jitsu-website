import { io, Socket } from 'socket.io-client'
import { useEffect, useState } from 'react'
import { SERVER_URL } from './urls'
import { formatCookies } from './utils'

/**
 * Handles the page where non admin players can perform actions. Not to be confused with PlayerPage which handles all types of users
 * @returns
 */
export default function UserPage (): JSX.Element {
  /** WebSocket connection as a player */
  const [socket, setSocket] = useState<Socket | null>(null)

  /**
   * Creates a media recorder that will send video chunks to the backend every 5 seconds
   * @param stream
   */
  function createMediaRecorder (stream: MediaStream): void {
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        socket?.emit('message', { blob: e.data, type: e.data.type })
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
    socket?.emit('screenshare', { name })
  }

  // connecting socket
  useEffect(() => {
    const socket = io(SERVER_URL)
    setSocket(socket)
  }, [])

  return (
    <div>
      <button onClick={startScreensharing}>share</button>
    </div>
  )
}
