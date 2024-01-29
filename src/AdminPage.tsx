import { useState } from "react"
import { AdminVideoPlayer } from "./AdminVideoPlayer"
import { ContextProvider } from "./Context/VideoContext"
import Options from "./Options"


export default function AdminPage (): JSX.Element {
  return (
    <ContextProvider>
      <div>
        <AdminVideoPlayer />
      </div>
    </ContextProvider>
  )
}
