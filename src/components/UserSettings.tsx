import { observer } from "mobx-react"
import { userStore } from "../lib/user.data"

export const UserSettings = observer(function UserSettings() {
   const userRecord = userStore.getUserRecord()
   return (
      <div className="flex flex-1 items-center justify-center">
         <div className="flex items-center justify-center">
            <span className="mr-2">Receive emails when partner publishes changes</span>
            <input
               type="checkbox"
               className="cursor-pointer"
               defaultChecked={userRecord.receiveEmailsOnPublish}
               onChange={(e) => {
                  userRecord.update({ receiveEmailsOnPublish: e.target.checked })
               }}
            />
         </div>
      </div>
   )
})
