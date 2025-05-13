// import admin from "firebase-admin"
// import { Handler, HandlerEvent, HandlerContext, schedule } from "@netlify/functions"
// import nodemailer from "nodemailer"
// import { config } from "dotenv"

// config()

// admin.initializeApp({
//    credential: admin.credential.cert({
//       projectId: "dialectica-e470f",
//       privateKey: Buffer.from(process.env.FIREBASE_KEY, "base64").toString("ascii"),
//       clientEmail: "firebase-adminsdk-sjgs8@dialectica-e470f.iam.gserviceaccount.com",
//    }),
//    databaseURL: "dialectica-e470f.firestore.io",
// })

// const exclude = ["TimelineData"]

// const transporter = nodemailer.createTransport({
//    service: "gmail",
//    auth: {
//       user: process.env.GMAIL_EMAIL,
//       pass: process.env.GMAIL_PASSWORD,
//    },
// })

// const backup: Handler = async (event: HandlerEvent, context: HandlerContext) => {
//    const collections = await await admin.firestore().listCollections()

//    const json: any = {}

//    for (const collection of collections) {
//       if (exclude.includes(collection.path)) continue

//       const docs = await (await collection.get()).docs.map((d) => d.data())
//       json[collection.path] = docs
//    }

//    try {
//       const mailOptions = {
//          from: `Backup <${process.env.GMAIL_EMAIL}>`,
//          to: process.env.GMAIL_EMAIL,
//          subject: `Dialectica Backup`, // email subject
//          html: "",
//          attachments: [
//             {
//                // utf-8 string as an attachment
//                filename: "backup.json",
//                content: JSON.stringify(json, null, 4),
//             },
//          ],
//       }

//       await new Promise((resolve) => {
//          transporter.sendMail(mailOptions, (e, info) => {
//             if (e) return console.log(e)
//             return resolve(1)
//          })
//       })
//       console.log("Email sent!")
//    } catch (e) {
//       console.log(e)
//    }

//    return {
//       statusCode: 200,
//    }
// }

// const handler = schedule("@daily", backup)

// export { handler }
