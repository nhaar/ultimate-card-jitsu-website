import { useState } from 'react'
import { registerAccount } from './api'

/** Component that handles the account creator page */
export default function AccountCreator (): JSX.Element {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  /** Create account when clicked */
  function createAccount (): void {
    void (async () => {
      const response = await registerAccount(username, password)
      if (response) {
        window.alert('Account created')
      } else {
        window.alert('Failed to create account')
      }
    })()
  }

  return (
    <div>
      <input className='input' placeholder='username' type='text' value={username} onChange={e => setUsername(e.target.value)} />
      <input className='input' placeholder='password' type='text' value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={createAccount} className='button'>
        Create
      </button>
    </div>
  )
}
