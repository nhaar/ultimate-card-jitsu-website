import { useState } from 'react'
import { setCookie } from './utils'
import Haiku from './Haiku'
import { performLogin } from './api'

/** Component for the login page */
export default function LoginPage (): JSX.Element {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  /** Attempts to log in player */
  function handleClickLogin (): void {
    void (async () => {
      const data = await performLogin(username, password)

      if (data !== undefined) {
        setCookie('token', data.token)
        setCookie('name', data.name)
        window.alert('Logged in!')
        window.location.href = '/'
      } else {
        window.alert('Incorrect username or password')
      }
    })()
  }

  return (
    <div className='has-text-primary burbank'>
      <div style={{
        fontSize: '24px'
      }}
      >
        <Haiku first='Ninjas are required' second='To give to Sensei their data' third='Are you a ninja?' />
      </div>
      <div className='is-flex is-justify-content-center'>
        <div style={{
          width: '300px'
        }}
        >
          <input className='input mb-3' type='text' value={username} onChange={e => setUsername(e.target.value)} placeholder='Username' />

          <input className='input mb-3' type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='Password' />

          <button
            className='button mb-4' onClick={handleClickLogin} style={{
              width: '100%'
            }}
          >LOG IN
          </button>
        </div>
      </div>
      <div style={{
        fontSize: '24px'
      }}
      >
        <Haiku first={'Can\'t create account'} second='Sensei must give it to you' third='If ninja you are' />
      </div>

    </div>
  )
}
