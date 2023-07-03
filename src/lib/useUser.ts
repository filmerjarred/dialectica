import { useState } from "react"
import { useEffect } from "react"
import { getAuth, User } from "firebase/auth"

export function useUserLoading() {
   const [state, setState] = useState<{ userLoading: boolean; user: null | User }>({ userLoading: true, user: null })

   useEffect(() => {
      getAuth().onAuthStateChanged((user) => {
         if (user) setState({ userLoading: false, user: user })
         else setState({ userLoading: false, user: null })
      })
   }, [])

   return state
}

export function getUser() {
   const user = getAuth().currentUser

   if (!user) throw new Error("Use user called without being logged in")

   return user
}
