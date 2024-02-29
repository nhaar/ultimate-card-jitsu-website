import { useState } from 'react'
import { registerOrUpdateAccount } from './api'

/** Component that handles the account creator page, which also handles changing passwords */
export default function AccountCreator (): JSX.Element {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  /** Create/update account when clicked */
  function createAccount (): void {
    void (async () => {
      const response = await registerOrUpdateAccount(username, password)
      if (response) {
        window.alert('Account created/updated')
      } else {
        window.alert('Failed to create/update account')
      }
    })()
  }

  return (
    <div style={{padding:'2%'}}>
      <p style={{
      fontSize: '24pt',
      color: '#FFF'
    }}
    className = "burbank">
        Create site accounts here!
      </p><br/>
      <input className='input' placeholder='Username' type='text' value={username} onChange={e => setUsername(e.target.value)} /><br/><br/>
      <input className='input' placeholder='Password' type='text' value={password} onChange={e => setPassword(e.target.value)} /><br/><br/>
      <button onClick={createAccount} className='button'>
        Create
      </button>
    </div>
  )
}
