import ReactDOM from "react-dom/client"
import "firebaseui/dist/firebaseui.css"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import * as Sentry from "@sentry/react"

if (process.env.NODE_ENV !== "development") {
   Sentry.init({
      dsn: "https://7c047ea3e7c449cbb87b62762b4a0c90@o4505111026860032.ingest.sentry.io/4505111029678080",
      integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
      // Performance Monitoring
      tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
      // Session Replay
      replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
      replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
      environment: process.env.NODE_ENV,
   })
}

import { App } from "./App"
import "./index.css"
import "./App.scss"
import "./lexical.scss"
import { hotkeyKeyDown } from "./lib/hotkeys"
import "react-toastify/dist/ReactToastify.css"
import { cardStore } from "./lib/card.data"

addEventListener("popstate", (event) => {
   cardStore.records.get(event.state)?.centerOnScreen()
})

const router = createBrowserRouter([
   { path: "/settings", element: <App /> },
   { path: "/", element: <App /> },
   { path: "/:boardId", element: <App /> },
])

document.addEventListener("keydown", hotkeyKeyDown)

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
   // <React.StrictMode>
   <RouterProvider router={router} />
   // </React.StrictMode>
)
