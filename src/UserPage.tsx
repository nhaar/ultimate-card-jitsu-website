import VideoPlayer from './VideoPlayer'
import { SocketContextProvider } from './Context/VideoContext'

/**
 * Handles the page where non admin players can perform actions. Not to be confused with PlayerPage which handles all types of users
 * @returns
 */
export default function UserPage (): JSX.Element {
  return (
    <SocketContextProvider>
      <div>
        <VideoPlayer />
      </div>
    </SocketContextProvider>
  )
}
