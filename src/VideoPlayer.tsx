import { useEffect, useRef, useState } from "react"
import { Socket } from "socket.io-client"

/** What a video chunk response from the backend looks like */
interface BlobResponse {
  /** Video binary data */
  blob: ArrayBuffer
  /** MIME type of video */
  type: string
  /** Socket ID of the user that is sending this video */
  id: string
}

/** Component for the video player that the admin sees */
export default function VideoPlayer ({ socket, socketId }: {
  /** Socket object for our socket */
  socket: Socket | null
  /** ID of the socket of the user that is sending video that we want to watch */
  socketId: string
}): JSX.Element {

  useEffect(() => {
    if (socket !== null) {
      // currently can only receive a single video at a time
      socket.on('message', (data) => {
        if (data.id !== socketId) return
        setBlob(data as BlobResponse)
      })
    }
  }, [socket])

  /** Saves the latest received video blob from the backend */
  const [blob, setBlob] = useState<BlobResponse | null>(null)

  /** URL of the latest video blob */
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const video1Ref = useRef<HTMLVideoElement>(null)
  const video2Ref = useRef<HTMLVideoElement>(null)

  /** Variable that keeps track of which video reference is visible and being watched */
  const [isUsingVideo1, setIsUsingVideo1] = useState(true)

  
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
