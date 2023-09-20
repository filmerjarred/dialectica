import "../external-modules/panzoom.js"
import { RefObject, createContext, createRef, useEffect, useRef } from "react"
import { BoardRecord } from "../lib/board.data.js"
import { MessageCircle, UserCircle } from "./BoardUserCircle"
import { Cards } from "./Cards"
import { ArcherContainer, ArcherContainerRef, ArcherElement } from "react-archer"
import { CardLocationType, Side, cardStore } from "../lib/card.data.js"
import { Loading } from "./Loading.js"
import { observer } from "mobx-react"
import { Timeline } from "./Timeline.js"
import { uiStore } from "../lib/ui.data.js"
import { userStore } from "../lib/user.data.js"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { createSearchParams, useNavigate, useSearchParams } from "react-router-dom"
import { BoardContextMenu, useBoardContextMenu } from "./BoardContextMenu.js"
import { Explorer } from "./ExplorerBar.js"
import { Finder } from "./Finder.js"

export const ArcherRefreshContext = createContext<RefObject<ArcherContainerRef>>({ current: null })

export const exportScaleHack = { scale: 1 }

export const DragAndDropTypes = {
   CARD: "card",
   TODO: "todo",
   FINDER_ITEM: "finder",
   WIKILINK: "wikilink",
}

export const Board = observer(function Board({ board }: { board: BoardRecord }) {
   const user = userStore.getUserRecord()

   const messageBoardRef = useRef(null)
   const positionBoardRef = useRef(null)
   const ownerCircleRef = useRef(null)

   const archerContainerRef = useRef<ArcherContainerRef>(null)

   const handleContextMenu = useBoardContextMenu()

   const navigate = useNavigate()
   const [searchParams, setSearchParams] = useSearchParams()
   const revealChanges = searchParams.get("reveal_changes")

   // panzoom
   const boardCanvasRef = createRef<HTMLDivElement>()
   useEffect(() => {
      if (boardCanvasRef.current && cardStore.loaded) {
         const ele = boardCanvasRef.current

         // @ts-ignore
         if (window.panzoom) {
            // @ts-ignore
            const instance = window.panzoom(ele, {
               smoothScroll: false,
               zoomSpeed: 0.1,
               filterKey: () => true,
               zoomDoubleClickSpeed: 1,
               enableTextSelection: true,
               transformOrigin: { x: 0.5, y: 0.5 },
               // initialX: -5000,
               beforeWheel: function () {
                  // allow wheel-zoom only if altKey is down. Otherwise - ignore
                  // return e.target.matches("div[is_card], div[is_card] *") || !!cardStore.currentSelected
               },

               beforeMouseDown: function (e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
                  // @ts-ignore
                  return e.target.matches("div[is_card], div[is_card] *") || uiStore.showFinder
               },
               onDoubleClick: function (e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
                  // @ts-ignore
                  // if (!e.target.matches("div[is_card], div[is_card] *")) {
                  //    instance.leftJustify(e.target)
                  //    instance.smoothMoveTo(0, 0)
                  //    instance.smoothMoveTo((ele.clientWidth / 2) * -1, 0)
                  // }
                  return true
               },
            })

            instance.leftJustify(ownerCircleRef.current, false)

            instance.on("zoom", () => {
               exportScaleHack.scale = instance.getTransform().scale
            })

            board.localNonObserved.panzoom = instance
            board.localNonObserved.justify = () => {
               instance.leftJustify(ownerCircleRef.current, false)
            }

            // @ts-ignore
            window.pzoom = instance

            return () => instance.dispose()
         }
      }
   }, [boardCanvasRef.current, cardStore.loaded])

   // manage url params
   useEffect(() => {
      if (cardStore.loaded && revealChanges) {
         board.revealLatest()
         searchParams.delete("reveal_changes")
         setSearchParams(searchParams)
         navigate(
            {
               search: createSearchParams(searchParams).toString(),
            },
            { replace: true }
         )
      }
   }, [cardStore.loaded])

   if (!cardStore.loaded) return <Loading />

   if (revealChanges) return <Loading />

   function onDoubleClick(e: React.MouseEvent<HTMLElement>) {
      if (e.detail > 1) {
         // @ts-ignore
         if (!e.target.matches("div[is_card], div[is_card] *")) {
            board.localNonObserved.panzoom.leftJustify(e.currentTarget)
         }
      }
   }

   return (
      <DndProvider backend={HTML5Backend}>
         {/* holds everything below header and between sidebars */}
         <div className="board-wrapper">
            { }
            {user.uiShowOwnerExplorer ? (
               <div className="flex border-r border-slate-300">
                  <Explorer side={Side.LEFT} />
               </div>
            ) : null}

            {/* is the size of the screen (minus the sidebars) and contains the massive canvas */}
            <div
               className="canvas-wrapper relative"
               onContextMenu={(e) => {
                  if (!e.altKey && !e.ctrlKey) {
                     handleContextMenu(e)
                  }
               }}
            >
               {uiStore.showFinder ? <Finder /> : null}

               { }
               {/* Stretches wide past window and handles the pan and zoom */}
               <div
                  className="infinite-canvas"
                  ref={boardCanvasRef}
               // onClick={(e) => {
               //    // @ts-ignore
               //    if (!e.target.matches("div[is_card], div[is_card] *")) {
               //       cardStore.setSelected(null)
               //    }
               // }}
               >
                  {/* CLAIM AND POSITIONS BOARD */}
                  <ArcherContainer
                     strokeColor="black"
                     strokeWidth={0.5}
                     svgContainerStyle={{ opacity: cardStore.currentSelected ? ".2" : "1" }}
                     endMarker={false}
                     className="archer-container"
                     ref={archerContainerRef}
                  >
                     <ArcherRefreshContext.Provider value={archerContainerRef}>
                        <div className="board flex-col" ref={positionBoardRef} onClick={onDoubleClick}>
                           {/* AGREED CENTRAL POSITIONS */}
                           {board.partner && board.agreedCentralPositions.length ? (
                              <div className="synthesis-cards">
                                 <ArcherElement id={board.id + "-" + "both"}>
                                    <div className="both-user-image-circles">
                                       <UserCircle user={board.owner} side={Side.TOP} />
                                       <UserCircle user={board.partner} side={Side.TOP} />
                                    </div>
                                 </ArcherElement>

                                 <div className="cards-wrapper">
                                    <Cards
                                       cards={board.agreedCentralPositions}
                                       side={Side.TOP}
                                       key={board.id + "top"}
                                       type={CardLocationType.POSITION}
                                    ></Cards>
                                 </div>
                              </div>
                           ) : null}

                           {/* LEFT & RIGHT VIEWS */}
                           <div ref={ownerCircleRef} className="left-and-right">
                              <UserCircle user={board.leftUser} side={Side.LEFT} />

                              <div className="cards-wrapper">
                                 <Cards
                                    cards={board.leftRoots}
                                    side={Side.LEFT}
                                    key={board.id + "left"}
                                    type={CardLocationType.POSITION}
                                 ></Cards>
                                 <Cards
                                    cards={board.rightRoots}
                                    side={Side.RIGHT}
                                    key={board.id + "right"}
                                    type={CardLocationType.POSITION}
                                 ></Cards>
                                 {/* {board.leftRoots.length < 2 || board.rightRoots.length < 2 ? (
                                 <div className="centerize text-slate-500 z-[-1]">Claims and positions</div>
                              ) : null} */}
                              </div>

                              {board.rightUser ? (
                                 <UserCircle user={board.rightUser} side={Side.RIGHT} />
                              ) : user !== board.leftUser ? (
                                 <UserCircle user={user} side={Side.RIGHT} />
                              ) : null}
                           </div>
                        </div>
                     </ArcherRefreshContext.Provider>
                  </ArcherContainer>
               </div>
            </div>

            <BoardContextMenu board={board} />

            {user.uiShowPartnerExplorer ? (
               <div className="flex border-l border-slate-300">
                  <Explorer side={Side.RIGHT} />
               </div>
            ) : null}
            {user.uiShowTimeline ? <Timeline board={board}></Timeline> : null}
         </div>
      </DndProvider>
   )
})
