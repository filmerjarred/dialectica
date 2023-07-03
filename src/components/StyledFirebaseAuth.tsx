import { useEffect, useRef, useState } from "react"
import * as firebaseAuthLib from "firebase/auth"
import { auth as firebaseUIAuth } from "firebaseui"
import "firebaseui/dist/firebaseui.css"
import { getAuth } from "firebase/auth"

const uiConfig: firebaseui.auth.Config = {
   // signInSuccessUrl: "http://127.0.0.1:5173/",

   signInFlow: "popup",

   signInOptions: [
      // Leave the lines as is for the providers you want to offer your users.
      firebaseAuthLib.GoogleAuthProvider.PROVIDER_ID,
      // firebaseAuthLib.FacebookAuthProvider.PROVIDER_ID,
      // firebaseUIAuth.AnonymousAuthProvider.PROVIDER_ID,
   ],
}

interface Props {
   // Callback that will be passed the FirebaseUi instance before it is
   // started. This allows access to certain configuration options such as
   // disableAutoSignIn().
   uiCallback?(ui: firebaseui.auth.AuthUI): void
   // The Firebase App auth instance to use.
   className?: string
}

const StyledFirebaseAuth = ({ className, uiCallback }: Props) => {
   const [userSignedIn, setUserSignedIn] = useState(false)
   const elementRef = useRef<HTMLDivElement>(null)

   useEffect(() => {
      // Get or Create a firebaseUI instance.
      const firebaseUiWidget = firebaseUIAuth.AuthUI.getInstance() || new firebaseUIAuth.AuthUI(getAuth())
      if (uiConfig.signInFlow === "popup") firebaseUiWidget.reset()

      // We track the auth state to reset firebaseUi if the user signs out.
      const unregisterAuthObserver = firebaseAuthLib.onAuthStateChanged(getAuth(), (user) => {
         if (!user && userSignedIn) firebaseUiWidget.reset()
         setUserSignedIn(!!user)
      })

      // Trigger the callback if any was set.
      if (uiCallback) uiCallback(firebaseUiWidget)

      // Render the firebaseUi Widget.
      firebaseUiWidget.start(elementRef.current!, uiConfig)

      return () => {
         unregisterAuthObserver()
         firebaseUiWidget.reset()
      }
   }, [])

   return <div className={className} ref={elementRef} />
}

export default StyledFirebaseAuth
