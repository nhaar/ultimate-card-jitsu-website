import { useState } from 'react'

/**
 * Handles the page where non admin players can perform actions. Not to be confused with PlayerPage which handles all types of users
 * @returns
 */
export default function UserPage (): JSX.Element {
  const [stream, setStream] = useState<MediaStream | null>(null)

  function handleClick (): void {
    void (async () => {
      (document.querySelector('#video') as HTMLVideoElement).srcObject = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      setStream(stream)
    })()
  }

  return (
    <div>
      Hello Ninja!
      <button onClick={handleClick}> STREAM YOUR SOUL</button>
      <video id='video' autoPlay />
    </div>
  )
}
