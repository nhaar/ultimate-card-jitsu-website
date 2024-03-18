import { useEffect, useRef, useState } from 'react'
import { formatCookies, getCookie } from './utils'
import { CPImaginedCredentials, editUserInfo, EditUserResponse, getAccountInfo, getCPImaginedCredentials, UserRole } from './api'
import Haiku from './Haiku'
import { performLogout } from './PlayerPage'
import { UcjWS } from './ws'

/** Page where the players can share screen */
function ScreensharePage (): JSX.Element {
  // using a ref because of it's "pointer" behavior being needed in the environment it's being called
  const amBeingWatched = useRef<boolean>(false)
  /** WebSocket connection as a player */
  const [socket] = useState<UcjWS>(() => {
    const socket = new UcjWS()

    socket.onMessage((data) => {
      switch (data.type) {
        case 'me': {
          setMe(data.value)
          break
        }
        case 'watch': {
          amBeingWatched.current = true
          break
        }
        case 'unwatch': {
          amBeingWatched.current = false
          break
        }
      }
    })

    return socket
  })
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
        // to save resources, will only convert and send data when being observed
        if (amBeingWatched.current) {
          // converting blob to base 64 string so it can be passed through the websocket with all the other information
          const reader = new FileReader()
          reader.readAsDataURL(e.data)
          reader.onloadend = () => {
            socket.send('stream-data', { blob: reader.result, type: e.data.type, id: me })
          }
        }
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
    } catch {
      // somewhat lazy way of doing this to prevent players from
      // sharing after it stopped working
      window.location.reload()
    }
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
    socket.send('screenshare', { name, id: me })
  }

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
            className='button mb-3 burbank' onClick={startScreensharing} style={{
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
        <input className='input mb-5 burbank' placeholder='Display Name' type='text' value={username} onChange={(e) => setUsername(e.target.value)} />
        <div className='mb-1'>(OPTIONAL) Pronouns to refer to you</div>
        <input className='input mb-5 burbank' placeholder='Pronouns' type='text' value={pronouns} onChange={(e) => setPronouns(e.target.value)} />
        {usePFP && <div className='mb-1'>(OPTIONAL) Profile picture</div>}
        {usePFP && <input className='mb-1' type='file' accept='image/*' onChange={receiveFile} />}
        {usePFP && <img className='mb-5' src={pfp} />}
        <button className='button mb-6 burbank' onClick={saveEdit}>SAVE CHANGES</button>
      </div>
    </div>
  )
}

/**
 * Handles the page where players can perform actions. Not to be confused with PlayerPage which includes the login screen. (these namings are confusing and bad)
 */
export default function UserPage ({ role }: {
  /** This user's role. */
  role: UserRole
}): JSX.Element {
  const [cpImaginedCredentials, setCPImaginedCredentials] = useState<CPImaginedCredentials | null>(null)
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
          <input className='input burbank' type='text' readOnly value={cpImaginedCredentials.username ?? ''} />
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          >Password:
          </div>
          <input className='input burbank' type='text' readOnly value={cpImaginedCredentials.password ?? ''} />
        </div>
      </div>

      )
  let adminDest = ''
  if (role === UserRole.Admin) {
    adminDest = '/admin'
  } else if (role === UserRole.CPIAdmin) {
    adminDest = '/cpimagined-credentials'
  }

  return (
    <div className='has-text-primary burbank'>
      <div style={{
        fontSize: '72px',
        textAlign: 'center',
        textShadow: '3px 3px 8px #000, -3px 3px 8px #000, -3px -3px 8px #000, 3px -3px 8px #000'
      }}
      >{username}
      </div>
      <div
        className='my-3' style={{
          fontSize: '24px'
        }}
      >
        <Haiku first='Welcome grasshopper' second={'In here there\'s much you can do'} third='Take a look below' />
      </div>
      {/* Admin button only for people with admin-like permissions */}
      {(role === UserRole.Admin || role === UserRole.CPIAdmin) &&
        <div className='box' style={{ fontSize: '14pt' }}>
          <Haiku first='Administrators' second='No fancy haiku for you' third='Go do your job already' />
          <div className='is-flex is-justify-content-center mt-2'>
            <button
              className='button is-danger burbank' onClick={() => { window.location.href = adminDest }} style={{
                width: '200px'
              }}
            >ADMIN PAGE
            </button>
          </div>
        </div>}
      <div className='box' style={{ fontSize: '14pt' }}>
        <Haiku first='Personality' second='Is important for ninjas' third='You may edit it here' />
        <div className='is-flex is-justify-content-center mt-2'>
          <button
            className='button burbank' onClick={() => { window.location.href = '/player?p=e' }} style={{
              width: '200px'
            }}
          >EDIT PROFILE
          </button>
        </div>
      </div>
      <div className='box is-flex is-justify-content-center is-flex-direction-column' style={{ fontSize: '14pt' }}>
        <Haiku first='If now you compete' second='Please share your screen to the stream' third='Else I cannot see!' />
        <div className='is-flex is-justify-content-center mt-2'>
          <button
            className='button burbank' onClick={() => { window.location.href = '/player?p=s' }} style={{
              width: '200px'
            }}
          >SCREENSHARE
          </button>
        </div>
      </div>
      <div className='box' style={{ fontSize: '14pt' }}>
        <div className='is-flex is-justify-content-center'>
          <a
            href='https://www.cpimagined.net/download' style={{
              color: '#169cf7',
              fontSize: '24px',
              textDecoration: 'underline'
            }}
          >CLICK HERE TO GO TO CPIMAGINED. YOU MUST DOWNLOAD THEIR CLIENT (100% NO SCAM GUARANTEE)
          </a>
        </div>
        <Haiku first='CPImagined' second='Is how you must play, but look!' third='Must use this account:' />
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
        <button className='button is-warning burbank' onClick={performLogout}>LOG OUT</button>
      </div>
      <div />
    </div>
  )
}
