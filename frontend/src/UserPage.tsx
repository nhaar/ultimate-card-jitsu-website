import { io, Socket } from 'socket.io-client'
import { useEffect, useRef, useState } from 'react'
import config from './config.json'
import { formatCookies, getCookie } from './utils'
import { editUserInfo, EditUserResponse, getAccountInfo, getCPImaginedCredentials } from './api'
import Haiku from './Haiku'
import { performLogout } from './PlayerPage'

/** Page where the players can share screen */
function ScreensharePage (): JSX.Element {
  /** WebSocket connection as a player */
  const [socket, setSocket] = useState<Socket | null>(null)
  /** WebSocket id that will be used to identify this player */
  const [me, setMe] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)

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

    // if trying to start when the user stops sharing, it will throw an error
    try {
      mediaRecorder.start(5000)
    } catch {}
  }

  /**
   * Starts sharing screen to backend
   */
  function startScreensharing (): void {
    void navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then((stream) => {
      if (videoRef.current !== null) {
        videoRef.current.srcObject = stream
      }
      createMediaRecorder(stream)
    })
    const name = formatCookies(document.cookie).name
    socket?.emit('screenshare', { name, id: me })
  }

  // connecting socket
  useEffect(() => {
    const socket = io(config.SERVER_URL)

    // this is for receiving the id from the backend
    socket.on('me', ({ id }) => {
      setMe(id)
    })

    // this is to signal that we are connecting and we want to get the ID (the socket will often reconnect and change ID so we only get it the first time)
    socket.emit('me')
    setSocket(socket)
  }, [])

  return (
    <div className='has-text-primary burbank is-flex is-justify-content-center'>
      <div className='is-flex is-flex-direction-column'>
        <div
          className='mt-2 mb-3' style={{
            fontSize: '32px'
          }}
        >
          <Haiku first='Your vision is seen' second='As long as you can see it' third='Down below the page' />
        </div>
        <div className='is-flex is-justify-content-center'>
          <button
            className='button mb-3' onClick={startScreensharing} style={{
              width: '300px'
            }}
          >START SCREENSHARING
          </button>
        </div>
        <video autoPlay ref={videoRef} width={500} className='mb-5' />
      </div>
    </div>
  )
}

/** Page where users can edit their profile */
function EditProfilePage ({ usePFP }: {
  /** Currently only used to disable it. PFP's not used at the moment. */
  usePFP: boolean
}): JSX.Element {
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
    <div className='has-text-primary burbank is-flex is-justify-content-center'>
      <div
        className='is-flex is-justify-content-center is-flex-direction-column' style={{
          width: '500px'
        }}
      >
        <div className='mt-4 mb-1'>Display Name (change this before the tournament starts)</div>
        <input className='input mb-5' type='text' value={username} onChange={(e) => setUsername(e.target.value)} />
        <div className='mb-1'>(OPTIONAL) Pronouns to refer to you</div>
        <input className='input mb-5' type='text' value={pronouns} onChange={(e) => setPronouns(e.target.value)} />
        {usePFP && <div className='mb-1'>(OPTIONAL) Profile picture</div>}
        {usePFP && <input className='mb-1' type='file' accept='image/*' onChange={receiveFile} />}
        {usePFP && <img className='mb-5' src={pfp} />}
        <button className='button mb-6' onClick={saveEdit}>SAVE CHANGES</button>
      </div>
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
      return <EditProfilePage usePFP={false} />
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
        <div className='is-flex is-justify-content-center'>
          <a
            href='https://www.cpimagined.net/' style={{
              color: '#363636',
              fontSize: '24px'
            }}
          >CLICK HERE TO GO TO CP IMAGINED. YOU MUST DOWNLOAD THEIR CLIENT (100% NO SCAM GUARANTEE)
          </a>
        </div>
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
      <div className='box is-flex is-justify-content-center'>
        <button className='button is-warning' onClick={performLogout}>LOG OUT</button>
      </div>
      <div />
    </div>
  )
}
