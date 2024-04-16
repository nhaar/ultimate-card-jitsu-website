import { useEffect, useState } from "react"
import { UserInfo, getAllUserInfo } from "./api"

/** Component for an admin only page that allows just viewing some info of all players */
export default function InfoViewer(): JSX.Element {
  const [info, setInfo] = useState<UserInfo[]>([])

  useEffect(() => {
    getAllUserInfo().then(setInfo)
  }, [])

  return (
    <div>
      {info.map((user, i) => {
        return (
          <div key={i}>
            <div>Name: {user.name}</div>
            <div>Discord: {user.discord}</div>
            <div>Pronouns: {user.pronouns}</div>
          </div>
        )
      })}
    </div>
  )
}