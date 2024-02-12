import { io, Socket } from 'socket.io-client'
import { useEffect, useState } from 'react'
import { SERVER_URL } from './urls'
import { formatCookies, getCookie } from './utils'
import { editUserInfo, EditUserResponse, getAccountInfo, getCPImaginedCredentials } from './api'
import Haiku from './Haiku'

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
  const [username, setUsername] = useState<string>(() => {
    return getCookie('name') ?? ''
  })
  const [pronouns, setPronouns] = useState<string>('')
  const [pfp, setPfp] = useState<string>('')

  useEffect(() => {
    void (async () => {
      const info = await getAccountInfo()
      setPronouns(info.pronouns)
      setPfp(info.pfp)
    })()
  }, [])

  /**
   * Event listener for changing the file input that handles the profile picture
   */
  function receiveFile (e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files !== null ? e.target.files[0] : null
    if (file !== null) {
      const reader = new FileReader()
      reader.onloadend = (e) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          setPfp(result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  /** Saves changes to an user */
  function saveEdit (): void {
    void (async () => {
      const editResponse = await editUserInfo(username, pronouns, pfp)
      switch (editResponse) {
        case EditUserResponse.Success:
          document.cookie = `name=${username}`
          alert('Profile updated!')
          window.location.reload()
          break
        case EditUserResponse.UsernameTaken:
          alert('Username taken')
          break
        case EditUserResponse.TemporarilyUnavailable:
          alert('Cannot change username while tournament is running')
          break
        case EditUserResponse.ServerFailure:
          alert('Failed to update profile')
          break
        case EditUserResponse.ImageTooBig:
          alert('Image too big! Try not to use images over 100 mb.')
          break
      }
    })()
  }

  return (
    <div>
      <div>Edit your profile</div>
      <div>Display Name (change this before the tournament starts)</div>
      <input type='text' value={username} onChange={(e) => setUsername(e.target.value)} />
      <div>(OPTIONAL) Pronouns to refer to you, if you want to specify</div>
      <input type='text' value={pronouns} onChange={(e) => setPronouns(e.target.value)} />
      <div>(OPTIONAL) Profile picture</div>
      <input type='file' accept='image/*' onChange={receiveFile} />
      <img src={pfp} />
      <button onClick={saveEdit}>SAVE CHANGES</button>
    </div>
  )
}

/**
 * Handles the page where non admin players can perform actions. Not to be confused with PlayerPage which handles all types of users
 */
export default function UserPage (): JSX.Element {
  const [cpImaginedCredentials, setCPImaginedCredentials] = useState<{ username: string, password: string } | null>(null)
  useEffect(() => {
    void (async () => {
      const credentials = await getCPImaginedCredentials()
      setCPImaginedCredentials(credentials)
    })()
  }, [])

  const username = getCookie('name') ?? 'Player'
  const urlParams = new URLSearchParams(window.location.search)
  const pageType = urlParams.get('p')
  switch (pageType) {
    case 'e':
      return <EditProfilePage />
    case 's':
      return <ScreensharePage />
  }

  const cpImaginedElement = cpImaginedCredentials === null
    ? (
      <div
        className='is-flex is-justify-content-center mt-3' style={{
          color: 'orange'
        }}
      >You haven't received your CPImagined account for the tournament yet. One will be given to you before the tournament starts.
      </div>
      )
    : (
      <div className='is-flex is-justify-content-center mt-3'>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '100px 200px',
          rowGap: '5px'
        }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          >Username:
          </div>
          <input className='input' type='text' readOnly value={cpImaginedCredentials.username} />
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          >Password:
          </div>
          <input className='input' type='text' readOnly value={cpImaginedCredentials.password} />
        </div>
      </div>

      )

  return (
    <div className='has-text-primary burbank'>
      <div style={{
        fontSize: '72px',
        textAlign: 'center'
      }}
      >"{username}"
      </div>
      <div
        className='my-3' style={{
          fontSize: '24px'
        }}
      >
        <Haiku first='Welcome grasshoper' second={'In here there\'s much you can do'} third='Take a look below' />
      </div>
      <div className='box'>
        <Haiku first='Personality' second='Is important for ninjas' third='You may edit it here' />
        <div className='is-flex is-justify-content-center mt-2'>
          <button
            className='button' onClick={() => { window.location.href = '/player?p=e' }} style={{
              width: '200px'
            }}
          >EDIT PROFILE
          </button>
        </div>
      </div>
      <div className='box is-flex is-justify-content-center is-flex-direction-column'>
        <Haiku first='If now you compete' second='Please share your screen to the stream' third='Else I cannot see!' />
        <div className='is-flex is-justify-content-center mt-2'>
          <button
            className='button' onClick={() => { window.location.href = '/player?p=s' }} style={{
              width: '200px'
            }}
          >SCREENSHARE
          </button>
        </div>
      </div>
      <div className='box'>
        <Haiku first='CP Imagined' second='Is how you must play, but look!' third='Must use this account:' />
        {cpImaginedElement}
        <div
          className='mt-2' style={{
            textAlign: 'center'
          }}
        >
          Refresh this page if you are told you have received a new account.
        </div>
      </div>
      <div />
    </div>
  )
}
