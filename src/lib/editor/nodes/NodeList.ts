/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { Klass, LexicalNode, ParagraphNode } from "lexical"

import { CodeHighlightNode, CodeNode } from "@lexical/code"
import { HashtagNode } from "@lexical/hashtag"
import { AutoLinkNode, LinkNode } from "@lexical/link"
import { ListItemNode, ListNode } from "@lexical/list"
import { MarkNode } from "@lexical/mark"
import { OverflowNode } from "@lexical/overflow"
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table"

import { CollapsibleContainerNode } from "../plugins/CollapsiblePlugin/CollapsibleContainerNode"
import { CollapsibleContentNode } from "../plugins/CollapsiblePlugin/CollapsibleContentNode"
import { CollapsibleTitleNode } from "../plugins/CollapsiblePlugin/CollapsibleTitleNode"
import { AutocompleteNode } from "./AutocompleteNode"
import { EmojiNode } from "./EmojiNode"
import { ExcalidrawNode } from "./ExcalidrawNode"
import { FigmaNode } from "./FigmaNode"
import { ImageNode } from "./ImageNode"
import { KeywordNode } from "./KeywordNode"
import { MentionNode } from "./MentionNode"
import { PollNode } from "./PollNode"
import { StickyNode } from "./StickyNode"
import { TableNode as NewTableNode } from "./TableNode"
import { TweetNode } from "./TweetNode"
import { YouTubeNode } from "./YouTubeNode"
import { WikiLinkNode } from "../plugins/WikiLinksPlugin"
import { QuestionNode } from "../plugins/QuestionPlugin"
import { DialecticaParagraphNode } from "../plugins/DialecticaParagraphPlugin"
import { uuidv4 } from "@firebase/util"

type X = {
   replace: Klass<LexicalNode>
   with: <
      T extends {
         new (...args: any): any
      }
   >(
      node: InstanceType<T>
   ) => LexicalNode
}

export function getNodeList(theme: string) {
   const nodeList: Array<Klass<LexicalNode> | X> = [
      WikiLinkNode,
      HeadingNode,
      ListNode,
      QuestionNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      NewTableNode,
      TableNode,
      TableCellNode,
      TableRowNode,

      LinkNode,
      ListNode,
      ListItemNode,

      DialecticaParagraphNode,

      HashtagNode,
      CodeHighlightNode,
      AutoLinkNode,
      LinkNode,
      OverflowNode,
      PollNode,
      StickyNode,
      ImageNode,
      MentionNode,
      EmojiNode,
      ExcalidrawNode,
      AutocompleteNode,
      KeywordNode,
      HorizontalRuleNode,
      TweetNode,
      YouTubeNode,
      FigmaNode,
      MarkNode,
      CollapsibleContainerNode,
      CollapsibleContentNode,
      CollapsibleTitleNode,
   ]

   if (theme === "Card") {
      nodeList.push({
         replace: ParagraphNode,
         with: (node: ParagraphNode) => {
            return new DialecticaParagraphNode(uuidv4())
         },
      })
   }

   return nodeList
}

export default NodeList
