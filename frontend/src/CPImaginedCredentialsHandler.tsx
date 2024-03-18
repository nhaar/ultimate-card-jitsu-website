import { useEffect, useState } from 'react'
import UserDataHandler from './UserDataHandler'
import { getUserCPIImaginedCredentials, getUsersWithoutCredentials, updateCPImaginedCredentials } from './api'

/** Child Component for `UserDataHandler` */
function ChildComponent ({ selectedUser, dataWatcher, updateData }: { selectedUser: string, dataWatcher?: number, updateData: (updater: () => Promise<boolean>) => void }): JSX.Element {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  useEffect(() => {
    void getUserCPIImaginedCredentials(selectedUser).then((data): void => {
      if (data !== null) {
        setUsername(data.username ?? '')
        setPassword(data.password ?? '')
      }
    })
  }, [dataWatcher])

  return (
    <div>
      <input style={{ marginBottom: '1%' }} type='input' className='input burbank' placeholder='CPImagined username' value={username} onChange={e => setUsername(e.target.value)} />
      <input style={{ marginBottom: '1%' }} type='input' className='input burbank' placeholder='CPImagined password' value={password} onChange={e => setPassword(e.target.value)} />
      <button
        className='button is-danger burbank' onClick={() => updateData(async (): Promise<boolean> => {
          return await updateCPImaginedCredentials(selectedUser, username, password)
        })}
      >CHANGE
      </button>
    </div>
  )
}

/** Component that renders the page where the admin is capable of updating the credentials to CPImagined. */
export default function CPImaginedCredentialsHandler (): JSX.Element {
  return (
    <UserDataHandler ChildComponent={ChildComponent} datalessFetcher={getUsersWithoutCredentials} />
  )
}
