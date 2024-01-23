import { useEffect, useState } from 'react'
import { postAndGetJSON } from './utils'
import LoginPage from './LoginPage'

type UserRole = 'user' | 'admin' | 'none'

export default function PlayerPage (): JSX.Element {
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined)

  useEffect(() => {
    void (async () => {
      const response = await postAndGetJSON('api/user/user-role', {})
      if (response !== null) {
        const role = (response as { role: UserRole }).role
        setUserRole(role)
      }
    })()
  }, [])

  switch (userRole) {
    case undefined: {
      return <div>Loading...</div>
    }
    case 'none': {
      return <LoginPage />
    }
    case 'user': {
      return <div>Logged in as user</div>
    }
    case 'admin': {
      return <div>Logged in as admin</div>
    }
  }
}
