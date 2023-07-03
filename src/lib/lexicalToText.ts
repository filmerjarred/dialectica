import { createEditor, $getRoot, EditorState } from "lexical"
import NodeList, { getNodeList } from "./editor/nodes/NodeList"
import { $isDialecticaParagraphNode } from "./editor/plugins/DialecticaParagraphPlugin"

const editor = createEditor({
   nodes: getNodeList("Card"),
   editable: true,
})

export const lexicalToText = (nodes: string | EditorState) => {
   nodes = typeof nodes === "string" ? editor.parseEditorState(nodes) : nodes

   return nodes.read(() => {
      return $getRoot()
         .getTextContent()
         .replace(/\n\n\n/g, "\n")
   })
}

export const removeNewlines = (nodes: string | EditorState): Promise<string | null> => {
   return new Promise((resolve) => {
      const state = typeof nodes === "string" ? editor.parseEditorState(nodes) : nodes

      state._flushSync = true

      let updated = false

      editor.setEditorState(state)
      editor.update(
         () => {
            const x = editor.getEditorState()

            Array.from(x._nodeMap.values()).forEach((node) => {
               if (!/\S+/.test($getRoot().getTextContent())) return

               if ($isDialecticaParagraphNode(node)) {
                  if (!/\S+/.test(node.getTextContent())) {
                     node.remove()
                     updated = true
                  }
               }
            })
         },
         {
            onUpdate: () => {
               resolve(JSON.stringify(editor.getEditorState().toJSON()))
            },
            discrete: true,
         }
      )

      if (!updated) resolve(null)
   })
}
