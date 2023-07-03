import { getUser } from "./useUser"
import * as Sentry from "@sentry/react"

const fnUrl = process.env.NODE_ENV === "production" ? "https://dialectica.netlify.app" : "http://127.0.0.1:9999"

export function emailPublish({ timelineId }: { timelineId: string }) {
   return send("email", { timelineId })
}

export async function send(fn: string, body?: any) {
   const user = getUser()

   const url = `${fnUrl}/.netlify/functions/${fn}`

   const idToken = await user.getIdToken()
   try {
      const rawResponse = await fetch(url, {
         method: "POST",
         headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "firebase-token": idToken,
         },
         body: body ? JSON.stringify(body) : undefined,
      }).catch((e) => {
         Sentry.captureException(e)
      })

      if (rawResponse) {
         if (rawResponse.status > 299) {
            const text = rawResponse.status + " - " + rawResponse.statusText + " - " + (await rawResponse.text())
            console.log(text)
            Sentry.captureMessage(`Request to "${url}" failed`)
            Sentry.captureMessage(text)
         } else {
            const content = await rawResponse.json()
            return content
         }
      }
   } catch (e) {
      console.log(e)
      throw e
   }
}
