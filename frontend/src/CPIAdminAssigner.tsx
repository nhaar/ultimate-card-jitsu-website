import { useEffect, useState } from 'react'
import { getAllPlayers, makeCPIAdmin } from './api'

/** Component for the page where you can make people CPI admins */
export default function CPIAdminAssigner (): JSX.Element {
  const [users, setUsers] = useState<string[]>([])

  useEffect(() => {
    void (async () => {
      setUsers(await getAllPlayers())
    })()
  }, [])

  /**
   * Get the callback for making someone a CPI admin
   * @param target Username of account
   * @returns Function to be used in the event listener
   */
  function getHandleClick (target: string): (() => void) {
    return () => {
      void makeCPIAdmin(target).then(response => {
        window.alert(response ? 'Success' : 'epic fail')
      })
    }
  }

  return (
    <div className='has-text-primary burbank'>
      {users.map((u, i) => {
        return (
          <div key={i} className='is-flex'>
            <div>{u}</div>
            <button onClick={getHandleClick(u)}>MAKE CPI ADMIN</button>
          </div>
        )
      })}
    </div>
  )
}
