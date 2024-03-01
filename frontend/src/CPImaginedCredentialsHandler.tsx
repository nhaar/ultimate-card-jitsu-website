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
    <div style={{ padding: '2%' }}>
      <div>
        <div
          className='burbank' style={{
            fontSize: '24pt',
            color: '#FFF'
          }}
        >USERS
        </div>
        {users.map((user, index) => (
          <button
            className='button' key={index} onClick={() => setSelectedUser(index)} style={selectedUser === index
              ? {
                  backgroundColor: 'blue',
                  color: 'white',
                  marginRight: '1%'
                }
              : { marginRight: '1%' }}
          >{user}
          </button>
        ))}
      </div><br />
      <input style={{ marginBottom: '1%' }} type='input' className='input' placeholder='CPImagined username' value={username} onChange={e => setUsername(e.target.value)} />
      <input style={{ marginBottom: '1%' }} type='input' className='input' placeholder='CPImagined password' value={password} onChange={e => setPassword(e.target.value)} />
      <button className='button is-danger' onClick={updateCredentials}>CHANGE</button>
    </div>
  )
}
