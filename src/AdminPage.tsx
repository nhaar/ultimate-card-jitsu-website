import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { SERVER_URL } from './urls'

import './styles/video-styles.css'
import { formatCookies } from './utils'

/** What a video chunk response from the backend looks like */
interface BlobResponse {
  /** Video binary data */
  blob: ArrayBuffer
  /** MIME type of video */
  type: string
}

/** Component that handles the admin page */
export default function AdminPage (): JSX.Element {
  /** WebSocket connection */
  const [socket, setSocket] = useState<Socket | null>(null)
  
  /** Saves the latest received video blob from the backend */
  const [blob, setBlob] = useState<BlobResponse | null>(null)

  /** URL of the latest video blob */
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const video1Ref = useRef<HTMLVideoElement>(null)
  const video2Ref = useRef<HTMLVideoElement>(null)

  /** Variable that keeps track of which video reference is visible and being watched */
  const [isUsingVideo1, setIsUsingVideo1] = useState(true)

  // connect socket as an admin to receive video chunks
  useEffect(() => {
    const socket = io(SERVER_URL)
    setSocket(socket)

    const token = formatCookies(document.cookie).token
    socket.emit('connectAdmin', { token })

    // currently can only receive a single video at a time
    socket.on('message', (data) => {
      setBlob(data as BlobResponse)
    })
  }, [])

  function getVideoSwapper (thisRef: React.RefObject<HTMLVideoElement>, otherRef: React.RefObject<HTMLVideoElement>) {
    return () => {
      if (thisRef.current !== null && otherRef.current !== null) {
        thisRef.current.className = 'video-visible'
        otherRef.current.className = 'video-hidden'
      }
    }
  }

  // once both refs are loaded, add event listeners that swapping the videos, used to avoid flickering (when switching video src, the video will flicker normally)
  useEffect(() => {
    if (video1Ref.current !== null && video2Ref.current !== null) {
      video1Ref.current.onloadeddata = getVideoSwapper(video1Ref, video2Ref)
      video2Ref.current.onloadeddata = getVideoSwapper(video2Ref, video1Ref)
    }
  }, [video1Ref, video2Ref])

  // update video when new blob is received
  useEffect(() => {
    if (blob !== null) {
      // must free memory of old blob
      URL.revokeObjectURL(blobUrl ?? '')
      
      const newBlobUrl = URL.createObjectURL(new Blob([blob.blob], { type: blob.type }))
      setBlobUrl(newBlobUrl)

      if (isUsingVideo1) {
        if (video2Ref.current !== null) {
          video2Ref.current.src = newBlobUrl
          setIsUsingVideo1(false)
        }
      } else {
        if (video1Ref.current !== null) {
          video1Ref.current.src = newBlobUrl
          setIsUsingVideo1(true)
        }
      }
    }
  }, [blob])

  return (
    <div>
      <video playsInline ref={video1Ref} autoPlay muted className='video-visible' />
      <video playsInline ref={video2Ref} autoPlay muted className='video-hidden' />
    </div>
  )
}
