import { createContext, useState } from "react"
import { useSearchParams, useLocation, Link, useParams } from "react-router-dom"
import StyledFirebaseAuth from "./components/StyledFirebaseAuth"
import { BoardRecord, boardStore } from "./lib/board.data"
import { CardRecord, cardStore } from "./lib/card.data"
import { Board } from "./components/Board"
import "react-contexify/ReactContexify.css"
import { CardContextMenu } from "./components/CardContextMenu"
import { UserRecord, userStore } from "./lib/user.data"
import { Loading } from "./components/Loading"
import { observer } from "mobx-react"
import { useUserLoading } from "./lib/useUser"
import { getAuth, User } from "firebase/auth"
import { UserSettings } from "./components/UserSettings"
import { uiStore } from "./lib/ui.data"
import { LocalLog } from "./components/LocalLog"
import _ from "lodash"
import { ToastContainer } from "react-toastify"

import { AutosizeInput } from "./components/AutoSizeInput"
import { DocumentReference, doc, query, where } from "firebase/firestore"
import { db } from "./lib/firebase"
import { FeedBack } from "./components/Feedback"
import { exportToMarkdown } from "./lib/exportToMarkdown"
import * as Sentry from "@sentry/react"
import { Help } from "./components/Help"
import { isMobile } from "./lib/isMobile"
import { Mobile } from "./components/Mobile"
import { ArcherContainerRef } from "react-archer"
import { TagContextMenu } from "./components/TagContextMenu"

type CurrentFocused = { card: CardRecord; element: string } | null

export type FocusCtx = {
   currentFocused: CurrentFocused
   setFocus: React.Dispatch<React.SetStateAction<CurrentFocused>>
}

export const UserContext = createContext<User>({} as User)

export const App = observer(function App() {
   const [searchParams, setSearchParams] = useSearchParams()
   const boardId = searchParams.get("board") || useParams().boardId

   const [spectatorUpdating, setSpectatorUpdating] = useState(false)

   const location = useLocation()

   const { userLoading, user } = useUserLoading()

   if (userLoading) return <Loading />
   if (spectatorUpdating) return <Loading />

   if (!user) return <StyledFirebaseAuth></StyledFirebaseAuth>

   if (isMobile()) {
      return <Mobile></Mobile>
   }

   Sentry.setUser({ email: user.email || undefined, username: user.displayName || undefined })

   const boards = Array.from(
      boardStore
         .loadRecords([
            query(boardStore.collection, where("userIds", "array-contains", user.uid)),
            ...(boardId ? [doc(db, "BoardData" + "/" + boardId) as DocumentReference<BoardRecord>] : []),
         ])
         .values()
   )
   if (!boardStore.loaded) return <Loading />

   const board = boardId ? boards.find((b) => b.id === boardId) || null : null

   if (board && !board.userIds.includes(user.uid) && !board.spectatorUserIds.includes(user.uid)) {
      setSpectatorUpdating(true)
      board.update({ spectatorUserIds: [...board.spectatorUserIds, user!.uid!] }, true).then(() => {
         setSpectatorUpdating(false)
      })
      return null
   }

   if (board) {
      boardStore.setCurrentBoard(board)
   }

   const users = Array.from(
      userStore
         .loadRecords([
            doc(db, "UserData" + "/" + user.uid) as DocumentReference<UserRecord>,
            ...(board
               ? board.userIds.map((userId) => doc(db, "UserData" + "/" + userId) as DocumentReference<UserRecord>)
               : []),
         ])
         .values()
   )
   if (!userStore.loaded) return <Loading />

   const userRecord = users.find((d) => d.id === user.uid)
      ? userStore.getUserRecord()
      : userStore.create({ id: user.uid, pic: user.photoURL || "/user.png" })

   if (user.photoURL !== userRecord.pic) {
      userRecord.update({ pic: user.photoURL! })
   }

   let appBody
   if (location.pathname === "/settings") {
      appBody = <UserSettings></UserSettings>
   } else if (board) {
      appBody = <Board board={board}></Board>
   } else {
      appBody = (
         <div className={`flex items-center justify-center flex-1`}>
            <div className="flex flex-col min-w-[250px]">
               <img src="/logo.png" className="self-center w-[250px] mb-[60px] mt-[-250px]"></img>

               {boards.map((board) => {
                  return (
                     <div className="flex my-1" key={board.id}>
                        <Link to={"/" + board.id} className="flex flex-1">
                           <button
                              // onClick={() => setSearchParams({ board: board.id })}
                              className="flex-1 text-left padding-1"
                           >
                              {board.name}
                           </button>
                        </Link>
                        {/* <button
                           onClick={() => setSearchParams({ board: board.id })}
                           className="flex-1 text-left padding-1"
                        >
                           {board.name}
                        </button> */}
                        <button hidden={board.userIds.length > 1} onClick={() => board.deleteCascade()} key={board.id}>
                           <i className="fal fa-times"></i>
                        </button>
                     </div>
                  )
               })}

               <button
                  className="my-5 p-3 mb-[40px]"
                  onClick={async () => {
                     await boardStore.newBoard()
                  }}
               >
                  New Board +
               </button>
            </div>
         </div>
      )
   }

   // let seen
   // function load() {
   //    console.log(cardBackup)
   //    cardBackup.forEach((c) => {
   //       if (!seen) seen = c.ownerUserId

   //       c.boardId = board.id
   //       c.ownerUserId = c.ownerUserId === seen ? board?.owner.id : board?.partner.id

   //       c.treeUserId = c.treeUserId === seen ? board?.owner.id : board?.partner.id

   //       cardStore.create(c)
   //    })
   // }

   return (
      <div className={`app ${cardStore.isHotseat ? "hotseat-mode" : ""}`}>
         <div className="header-wrapper">
            <div className="header text-sm">
               <Link to={"/settings"}>
                  <img className="user-image-circle" src={user.photoURL!}></img>
               </Link>
               <button className="ml-2" onClick={() => uiStore.toggleShowFeedback()}>
                  📢 Feedback
               </button>

               <Link to={"/"}>
                  <button className="ml-2">🔲 Boards</button>
               </Link>
               <button
                  className="ml-2"
                  onClick={() => userRecord.update({ uiShowOwnerExplorer: !userRecord.uiShowOwnerExplorer })}
               >
                  📂 Explorer
               </button>
               <button className="ml-2" onClick={() => userRecord.toggleShowHelp()}>
                  🙏 Help
               </button>
               <button className="ml-2" onClick={exportToMarkdown}>
                  📤 Export
               </button>
               {/* <button className="ml-2" onClick={() => uiStore.toggleShowLog()}>
                  📜 Log
               </button> */}

               {board ? (
                  <>
                     <span className="flex flex-1 justify-center">
                        <span className="relative">
                           <AutosizeInput
                              className="text-center outline-none margin-auto min-w-[100px]"
                              value={board?.name}
                              onChange={(e) => board.update({ name: e.target.value })}
                           ></AutosizeInput>
                        </span>
                     </span>

                     <button
                        hidden={!board.hasUnrevealedChanges}
                        className="mr-2 disabled:opacity-50"
                        onClick={board.revealLatest}
                     >
                        <span className="button__badge right-1"></span>
                        🔎 Reveal Latest
                     </button>

                     {/* <button
               className="ml-2"
               onClick={() => {
                  const board = boardStore.getCurrentBoard()
                  const fileName = `dialectica-db-${new Date().toISOString()}.json`

                  // Create a blob of the data
                  const fileToSave = new Blob(
                     [
                        JSON.stringify(
                           board.cards.map((c) => _.omit(c, ["local", "localNonObserved"])),
                           null,
                           4
                        ),
                     ],
                     {
                        type: "application/json",
                     }
                  )

                  // Save the file
                  saveAs(fileToSave, fileName)
               }}
            >
               Save
            </button> */}
                     {/* 
                  <button className="ml-2" onClick={load}>
                     Load
                  </button> */}

                     <button
                        className="mr-2"
                        onClick={() => {
                           cardStore.setSelected(null)
                           board.fold(1)
                           board.localNonObserved.justify ? board.localNonObserved.justify() : null
                        }}
                     >
                        🧹 Fold
                     </button>
                     <button className="mr-2" onClick={() => board.incrementalExpand()}>
                        🔱 Expand
                     </button>
                     <button className="mr-2" onClick={board.switch}>
                        🔀 Switch
                     </button>
                     <button
                        hidden={!board.hasUnpublishedChanges && board.userIds.length > 1}
                        className="mr-2 disabled:opacity-50"
                        onClick={board.publish}
                     >
                        <span className="button__badge right-1"></span>
                        🗞 Publish
                     </button>

                     <button
                        className="mr-2"
                        onClick={() => userRecord.update({ uiShowPartnerExplorer: !userRecord.uiShowPartnerExplorer })}
                     >
                        📂 Partner Explorer
                     </button>

                     <button className="mr-2" onClick={userRecord.toggleShowTimeline}>
                        ⌛ Timeline
                     </button>
                  </>
               ) : null}
            </div>
         </div>

         <TagContextMenu />
         <CardContextMenu />
         <ToastContainer autoClose={1000} hideProgressBar={true} theme="light" />

         {uiStore.showFeedback ? <FeedBack /> : null}
         {/* {uiStore.showLog ? <LocalLog /> : null} */}

         <div className="flex flex-1" style={{ height: "calc(100% - 57px)" }}>
            {userRecord.uiShowHelp ? <Help /> : null}
            {appBody}
         </div>
      </div>
   )
})
