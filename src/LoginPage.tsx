import { useState } from 'react'
import { postJSON } from './utils'

/** Component for the login page */
export default function LoginPage (): JSX.Element {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  /** Attempts to log in player */
  function handleClickLogin (): void {
    void (async () => {
      const response = await postJSON('api/user/login', {
        username,
        password
      })

      if (response.status === 200) {
        const data = (await response.json()) as { token: string, name: string }
        document.cookie = `token=${data.token}`
        document.cookie = `name=${data.name}`
        window.alert('Logged in!')
        window.location.href = '/'
      } else {
        window.alert('Incorrect username or password')
      }
    })()
  }

  return (
    <div>
      <input type='text' value={username} onChange={e => setUsername(e.target.value)} placeholder='Username' />

      <input type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='Password' />

      <button onClick={handleClickLogin}>LOG IN</button>
    </div>
  )
}
