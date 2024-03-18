import { useEffect, useState } from 'react'
import UserDataHandler from './UserDataHandler'
import { getDiscordlessUsers, getUserDiscord, updateUserDiscord } from './api'

/** Child component for `UserDataHandler` */
function ChildComponent ({ selectedUser, dataWatcher, updateData }: { selectedUser: string, dataWatcher?: number, updateData: (updater: () => Promise<boolean>) => void }): JSX.Element {
  const [discord, setDiscord] = useState<string>('')

  useEffect(() => {
    void getUserDiscord(selectedUser).then((data): void => {
      if (data !== null) {
        setDiscord(data)
      }
    })
  }, [dataWatcher])

  return (
    <div>
      <input style={{ marginBottom: '1%' }} type='input' className='input burbank' placeholder='Discord' value={discord} onChange={e => setDiscord(e.target.value)} />
      <button
        className='button is-danger burbank' onClick={() => updateData(async (): Promise<boolean> => {
          return await updateUserDiscord(selectedUser, discord)
        })}
      >CHANGE
      </button>
    </div>
  )
}

/** Component for the user discord assign page */
export default function DiscordAssigner (): JSX.Element {
  return (
    <UserDataHandler ChildComponent={ChildComponent} datalessFetcher={getDiscordlessUsers} />
  )
}
