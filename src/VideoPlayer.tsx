import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'

/** What a video chunk response from the backend looks like */
interface BlobResponse {
  /** Video binary data */
  blob: ArrayBuffer
  /** MIME type of video */
  type: string
  /** Socket ID of the user that is sending this video */
  id: string
}

/** Maps all player IDs and their last generated blob URL. Used to persist video between creating new video players. */
export interface VideoCache {
  [id: string]: string
}

/** Information on how to crop a screen. The numbers are in percentages. Eg. 25 left means that 25% of the left side is left out */
export interface CropInfo {
  left: number
  top: number
  right: number
  bottom: number
}

/** Component for what controls the video display. The video will always fit the given width and height (will distort for that) */
function VideoElement ({ videoRef, className, width, height, cropInfo }: {
  /** React ref to the video element */
  videoRef: React.RefObject<HTMLVideoElement>
  /** Initial CSS class to use */
  className: string
  /** Width of video */
  width: number
  /** Height of video */
  height: number
  /** Crop information that dictates how to crop this video */
  cropInfo: CropInfo
}): JSX.Element {
  return (
    // parent div used to keep the size of the video
    <div
      className={className}
      style={{
        overflow: 'hidden',
        width: `${width}px`,
        height: `${height}px`
      }}
    >
      {/* second div is used to stretch the video arbitrarily */}
      <div style={{
        // sizes are stretched to be bigger so that the parts that we want cropped out can be overflowed away and hidden
        width: `${100 * 100 / (100 - cropInfo.right - cropInfo.left)}%`,
        height: `${100 * 100 / (100 - cropInfo.bottom - cropInfo.top)}%`
      }}
      >
        <video
          playsInline
          ref={videoRef}
          autoPlay
          muted
          style={{
            objectFit: 'fill',
            width: '100%',
            height: '100%',
            marginLeft: `-${cropInfo.left}%`,
            marginTop: `-${cropInfo.top}%`
          }}
        />
      </div>
    </div>
  )
}

/** Component for the video player that the admin sees */
export default function VideoPlayer ({ socket, socketId, width, height, videoCache, setVideoCache, cropInfo = { left: 0, right: 0, top: 0, bottom: 0 } }: {
  /** Socket object for our socket */
  socket: Socket | null
  /** ID of the socket of the user that is sending video that we want to watch */
  socketId: string
  /** Width of the video */
  width: number
  /** Height of the video */
  height: number
  /** Crop info of the video */
  cropInfo?: CropInfo
  /** Video cache of parent */
  videoCache: VideoCache
  /** Function for setting video cache of parent */
  setVideoCache: React.Dispatch<React.SetStateAction<VideoCache>>
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

  /**
   * Saves the latest received video blob from the backend
   * */
  const [blob, setBlob] = useState<BlobResponse | null>(null)

  /** URL of the latest video blob */
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    // to get the video from the cache if it exists
    if (socketId in videoCache) {
      return videoCache[socketId]
    }
    return null
  })

  const video1Ref = useRef<HTMLVideoElement>(null)
  const video2Ref = useRef<HTMLVideoElement>(null)

  /** Variable that keeps track of which video reference is visible and being watched */
  const [isUsingVideo1, setIsUsingVideo1] = useState(true)

  function getVideoSwapper (thisRef: React.RefObject<HTMLVideoElement>, otherRef: React.RefObject<HTMLVideoElement>) {
    return () => {
      if (thisRef.current !== null && otherRef.current !== null && thisRef.current.parentElement !== null && otherRef.current.parentElement !== null && thisRef.current.parentElement.parentElement !== null && otherRef.current.parentElement.parentElement !== null) {
        thisRef.current.parentElement.parentElement.className = 'video-visible'
        otherRef.current.parentElement.parentElement.className = 'video-hidden'
      }
    }
  }

  // initializing when video refs are loaded
  // add event listeners that swapping the videos, used to avoid flickering (when switching video src, the video will flicker normally)
  // initialize cached video if it exists
  useEffect(() => {
    if (video1Ref.current !== null && video2Ref.current !== null) {
      video1Ref.current.onloadeddata = getVideoSwapper(video1Ref, video2Ref)
      video2Ref.current.onloadeddata = getVideoSwapper(video2Ref, video1Ref)
      if (blobUrl !== null) {
        video1Ref.current.src = blobUrl
        setIsUsingVideo1(true)
      }
    }
  }, [video1Ref, video2Ref])

  // update video when new blob is received
  useEffect(() => {
    if (blob !== null) {
      // must free memory of old blob
      URL.revokeObjectURL(blobUrl ?? '')

      const newBlobUrl = URL.createObjectURL(new Blob([blob.blob], { type: blob.type }))
      setBlobUrl(newBlobUrl)

      // to save in cache
      setVideoCache((prev) => ({ ...prev, [socketId]: newBlobUrl }))

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
      <VideoElement videoRef={video1Ref} className='video-visible' width={width} height={height} cropInfo={cropInfo} />
      <VideoElement videoRef={video2Ref} className='video-hidden' width={width} height={height} cropInfo={cropInfo} />
    </div>
  )
}
