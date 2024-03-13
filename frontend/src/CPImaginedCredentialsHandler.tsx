import { useEffect, useState } from 'react'
import { getAllPlayers, getUserCPIImaginedCredentials, getUsersWithoutCredentials, updateCPImaginedCredentials } from './api'

/** Component that renders the page where the admin is capable of updating the credentials to CPImagined. */
export default function CPImaginedCredentialsHandler (): JSX.Element {
  const [users, setUsers] = useState<string[]>([])
  const [credentialessUsers, setCredentialessUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<number>(0)
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  /** Updates credentials with the given data */
  function updateCredentials (): void {
    void (async () => {
      const updated = await updateCPImaginedCredentials(users[selectedUser], username, password)
      if (updated) {
        await updateUsersWithoutCredentials()
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
      await updateUsersWithoutCredentials()
      updateToUserCredentials(users[0])
    })()
  }, [])

  /** Fetch and store the users without credentials as a state */
  async function updateUsersWithoutCredentials (): Promise<void> {
    setCredentialessUsers(await getUsersWithoutCredentials())
  }

  /** Fetch and user credentials and store in the state variables */
  function updateToUserCredentials (username: string): void {
    void getUserCPIImaginedCredentials(username).then((data): void => {
      if (data !== null) {
        setUsername(data.username ?? '')
        setPassword(data.password ?? '')
      }
    })
  }

  /**
   * Get callback that handles selecting an user
   * @param username Regular username
   * @param index Index in the selected users array
   * @returns
   */
  function getHandleSelectUser (username: string, index: number): () => void {
    return () => {
      setSelectedUser(index)
      updateToUserCredentials(username)
    }
  }

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
        {users.map((user, index) => {
          const unselectedBackgroundColor = credentialessUsers.includes(user) ? 'red' : undefined
          const unselectedBorderColor = credentialessUsers.includes(user) ? '#690404' : undefined
          return (
            <button
              className='button burbank' key={index} onClick={getHandleSelectUser(user, index)} style={selectedUser === index
                ? {
                    backgroundColor: 'blue',
                    color: 'white',
                    marginRight: '1%',
                    borderColor: '#05043d'
                  }
                : { marginRight: '1%', backgroundColor: unselectedBackgroundColor, borderColor: unselectedBorderColor }}
            >{user}
            </button>
          )
        })}
      </div><br />
      <input style={{ marginBottom: '1%' }} type='input' className='input burbank' placeholder='CPImagined username' value={username} onChange={e => setUsername(e.target.value)} />
      <input style={{ marginBottom: '1%' }} type='input' className='input burbank' placeholder='CPImagined password' value={password} onChange={e => setPassword(e.target.value)} />
      <button className='button is-danger burbank' onClick={updateCredentials}>CHANGE</button>
    </div>
  )
}
