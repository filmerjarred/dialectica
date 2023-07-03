import saveAs from "file-saver"
import { boardStore } from "./board.data"
import { lexicalToText } from "./lexicalToText"

export function exportToMarkdown() {
   const board = boardStore.getCurrentBoard()
   const fileName = `${board.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`

   // Create a blob of the data
   const fileToSave = new Blob(
      [
         board.cards
            .map((c) => {
               return `
# ${c.title || "untitled"}   

${lexicalToText(c.text)}`
            })
            .join("\n"),
      ],
      {
         type: "application/text",
      }
   )

   // Save the file
   saveAs(fileToSave, fileName)
}
