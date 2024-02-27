import { useEffect, useState } from 'react'
import { getAllPlayers, updateCPImaginedCredentials } from './api'

/** Component that renders the page where the admin is capable of updating the credentials to CPImagined. */
export default function CPImaginedCredentialsHandler (): JSX.Element {
  const [users, setUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<number>(0)
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  /** Updates credentials with the given data */
  function updateCredentials (): void {
    void (async () => {
      const updated = await updateCPImaginedCredentials(users[selectedUser], username, password)
      if (updated) {
        window.alert('Credentials updated')
      } else {
        window.alert('Failed to update credentials')
      }
    })()
  }

  useEffect(() => {
    void (async () => {
      const users = await getAllPlayers()
      setUsers(users)
    })()
  }, [])

  return (
    <div>
      <div>
        USERS
        {users.map((user, index) => (
          <button
            className='button' key={index} onClick={() => setSelectedUser(index)} style={selectedUser === index
              ? {
                  backgroundColor: 'blue',
                  color: 'white'
                }
              : {}}
          >{user}
          </button>
        ))}
      </div>
      <input type='input' className='input' value={username} onChange={e => setUsername(e.target.value)} />
      <input type='input' className='input' value={password} onChange={e => setPassword(e.target.value)} />
      <button className='button is-danger' onClick={updateCredentials}>CHANGE</button>
    </div>
  )
}
