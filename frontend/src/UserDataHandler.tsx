import { useEffect, useState } from 'react'
import { getAllPlayers } from './api'

/** A base component used to create a page where an admin can look through every user and change one specific bit of their data, eg the component for changing their CPImagined accounts */
export default function UserDataHandler ({ ChildComponent, datalessFetcher }: {
  /** ChildComponent must be a component that will do the actual editting of the data. It will take arguments that will let it know what to do and it must provide the means to edit the data. It must also contain an effect that listens for `dataWatcher` and when it changes it fetches the the data of the selected user. */
  ChildComponent: (data: {
    /** A string that will be passed containing the website username of the user currently being editted */
    selectedUser: string
    /** A test variable used only to know when the selected user changes. Should be used in an `useEffect` */
    dataWatcher?: number
    /** A function that must be called when the data is to be updated in the backend. The argument must be another function which must asynchronously update the data and return a boolean on whether it was succesful. */
    updateData: (updater: () => Promise<boolean>) => void
  }) => JSX.Element
  /** A function that will fetch for all users that have no data linked to them, and return in the format of usernames. */
  datalessFetcher: () => Promise<string[]>
}): JSX.Element {
  const [users, setUsers] = useState<string[]>([])
  const [datalessUsers, setDatalessUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<number>(0)
  const [dataWatcher, setDataWatcher] = useState<number>(0)

  /** Updates data with the given data */
  function updateData (updater: () => Promise<boolean>): void {
    void (async () => {
      const updated = await updater()
      if (updated) {
        await updateDatalessUsers()
        window.alert('Data updated')
      } else {
        window.alert('Failed to update data')
      }
    })()
  }

  useEffect(() => {
    void (async () => {
      setUsers(await getAllPlayers())
      await updateDatalessUsers()
      setDataWatcher(0)
    })()
  }, [])

  /** Fetch and store the users without credentials as a state */
  async function updateDatalessUsers (): Promise<void> {
    setDatalessUsers(await datalessFetcher())
  }

  /**
   * Get callback that handles selecting an user
   * @param index Index in the selected users array
   * @returns
   */
  function getHandleSelectUser (index: number): () => void {
    return () => {
      setSelectedUser(index)
      setDataWatcher(d => d + 1)
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
          const unselectedBackgroundColor = datalessUsers.includes(user) ? 'red' : undefined
          const unselectedBorderColor = datalessUsers.includes(user) ? '#690404' : undefined
          return (
            <button
              className='button burbank' key={index} onClick={getHandleSelectUser(index)} style={selectedUser === index
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
      <ChildComponent selectedUser={users[selectedUser]} dataWatcher={dataWatcher} updateData={updateData} />
    </div>
  )
}
