import admin from "firebase-admin"
import { Handler } from "@netlify/functions"
import { isAuthenticated } from "../isAuthenticated"
import nodemailer from "nodemailer"
import { config } from "dotenv"
import type { TimelineRecord, TimelineDataChunk } from "../../../src/lib/timeline.data"

config()

let transporter = nodemailer.createTransport({
   service: "gmail",
   auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_PASSWORD,
   },
})

const websiteUrl = process.env.NODE_ENV === "production" ? "https://dialectica.app" : "http://localhost:5173"

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }

export interface EmailInput {
   timelineId: string
}

export const handler: Handler = async (event, context) => {
   if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers }

   const user = await isAuthenticated(event)
   if (!user) return { statusCode: 401, headers }

   const data: EmailInput = JSON.parse(event.body!)

   const publishEvent = (await (
      await admin.firestore().collection("TimelineData").doc(data.timelineId).get()
   ).data()) as TimelineRecord
   if (!publishEvent) throw new Error("could not get timeline data")

   const toUser = await admin.auth().getUser(publishEvent.partnerUserId)
   if (!toUser) throw new Error("could not find to user")

   const toUserRecord = await admin.firestore().collection("UserData").doc(data.timelineId).get()
   if (toUserRecord?.data()?.receiveEmailsOnPublish === false) {
      return {
         statusCode: 200,
         headers,
         body: JSON.stringify({
            message: "to user emails disabled",
         }),
      }
   }

   const fromUser = await admin.auth().getUser(publishEvent.publishingUserId)
   if (!fromUser) throw new Error("could not find from user")

   const url = `${websiteUrl}?board=${publishEvent.boardId}&reveal_changes=true`

   const changes = JSON.parse(publishEvent.data) as TimelineDataChunk[]

   function changesToHTML(changes: TimelineDataChunk[]) {
      return `<ul style="padding-left:0px">
      ${changes
         .map((change) => {
            return `<li>
            ${(() => {
               if (change.oldText !== change.newText) {
                  return `<strong>${change.newTitle || change.oldTitle}</strong> <span>${
                     change.newText || change.oldText
                  }</span>`
               }
            })()}
         </li>`
         })
         .join("\n")}
   </ul>
   `
   }

   const x = `To see board <a href="${url}">click here</a>
   </br>
   </br>
   
   <p>Change Summary:</p>

   ${changesToHTML(changes)}
   `

   const mailOptions = {
      from: `${fromUser.displayName} <${process.env.GMAIL_EMAIL}>`,
      to: toUser.email,
      subject: `${fromUser.displayName} has published changes to your shared dialectica board`, // email subject
      html: x,
   }

   try {
      await new Promise((resolve) => {
         transporter.sendMail(mailOptions, (e, info) => {
            if (e) return console.log(e)
            return resolve(1)
         })
      })
      console.log("Email sent!")
   } catch (e) {
      console.log(e)
   }

   return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
         message: "authenticated!",
      }),
   }
}
