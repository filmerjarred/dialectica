import { Handler } from "@netlify/functions"
import { isAuthenticated } from "../isAuthenticated"
import nodemailer from "nodemailer"
import { config } from "dotenv"

config()

let transporter = nodemailer.createTransport({
   service: "gmail",
   auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_PASSWORD,
   },
})

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }

export interface EmailInput {
   feedback: string
}

export const handler: Handler = async (event, context) => {
   if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers }

   const user = await isAuthenticated(event)
   if (!user) return { statusCode: 401, headers }

   const data: EmailInput = JSON.parse(event.body!)

   const mailOptions = {
      from: `${user.displayName} <${process.env.GMAIL_EMAIL}>`,
      to: process.env.GMAIL_EMAIL,
      subject: `${user.displayName} has feedback!`, // email subject
      html: data.feedback,
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
