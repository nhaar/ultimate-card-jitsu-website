import { AdminVideoPlayer } from './AdminVideoPlayer'
import { SocketContextProvider } from './Context/VideoContext'

/** Component that handles the admin page */
export default function AdminPage (): JSX.Element {
  return (
    <SocketContextProvider>
      <div>
        <AdminVideoPlayer />
      </div>
    </SocketContextProvider>
  )
}
