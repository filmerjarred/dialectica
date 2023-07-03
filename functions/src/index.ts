import * as functions from "firebase-functions"
import { createTransport } from "nodemailer"

const GMAIL_EMAIL = functions.params.defineString("GMAIL_EMAIL").value()
const GMAIL_PASSWORD = functions.params.defineString("GMAIL_PASSWORD").value()

let transporter = createTransport({
   service: "gmail",
   auth: {
      user: GMAIL_EMAIL,
      pass: GMAIL_PASSWORD,
   },
})

exports.sendWelcomeEmail = functions.auth.user().onCreate((user) => {
   console.log("triggered")

   const mailOptions = {
      from: `Dialectica <${GMAIL_EMAIL}>`,
      to: GMAIL_EMAIL,
      subject: `Dialecica signup! ${user.displayName} ${user.email}`, // email subject
      html: `Dialecica signup! ${user.displayName} ${user.email}`,
   }

   transporter.sendMail(mailOptions, (e, info) => {
      if (e) return console.log(e)
      else console.log("sent")
   })
})
