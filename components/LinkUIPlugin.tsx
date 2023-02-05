import React from 'react'
import * as Popover from '@radix-ui/react-popover'
import * as Tooltip from '@radix-ui/react-tooltip'

import { CheckIcon, ClipboardCopyIcon, Cross2Icon, ExternalLinkIcon, LinkBreak1Icon, Pencil1Icon } from '@radix-ui/react-icons'
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  ElementNode,
  KEY_MODIFIER_COMMAND,
  LexicalEditor,
  RangeSelection,
  SELECTION_CHANGE_COMMAND,
  TextNode,
} from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $isAtNodeEnd } from '@lexical/selection'
import { mergeRegister } from '@lexical/utils'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'

export function getSelectedNode(selection: RangeSelection): TextNode | ElementNode {
  const anchor = selection.anchor
  const focus = selection.focus
  const anchorNode = selection.anchor.getNode()
  const focusNode = selection.focus.getNode()
  if (anchorNode === focusNode) {
    return anchorNode
  }
  const isBackward = selection.isBackward()
  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode
  } else {
    return $isAtNodeEnd(anchor) ? anchorNode : focusNode
  }
}

function getSelectionRectangle(editor: LexicalEditor) {
  const selection = $getSelection()
  const nativeSelection = window.getSelection()
  const activeElement = document.activeElement

  const rootElement = editor.getRootElement()

  if (
    selection !== null &&
    nativeSelection !== null &&
    rootElement !== null &&
    rootElement.contains(nativeSelection.anchorNode) &&
    editor.isEditable()
  ) {
    const domRange = nativeSelection.getRangeAt(0)
    let rect
    if (nativeSelection.anchorNode === rootElement) {
      let inner = rootElement
      while (inner.firstElementChild != null) {
        inner = inner.firstElementChild as HTMLElement
      }
      rect = inner.getBoundingClientRect()
    } else {
      rect = domRange.getBoundingClientRect()
    }

    return rect
  } else if (!activeElement || activeElement.className !== 'link-input') {
    return null
  }
  return null
}

export function LinkUIPlugin() {
  const [editor] = useLexicalComposerContext()
  const [open, setOpen] = React.useState(false)
  const [url, setUrl] = React.useState<string | null>(null)
  const [initialUrl, setInitialUrl] = React.useState<string | null>(null)
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const [editMode, setEditMode] = React.useState(false)

  const applyUrlChanges = React.useCallback(
    (input: HTMLInputElement) => {
      const url = input.value
      if (url.trim() !== '') {
        setEditMode(false)
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
      } else {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
      }
    },
    [editor]
  )

  const cancelChange = React.useCallback(() => {
    setEditMode(false)
    setUrl(initialUrl)
    if (initialUrl === null) {
      setOpen(false)
      editor.focus()
    }
  }, [initialUrl, editor])

  const onKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        applyUrlChanges(e.target as HTMLInputElement)
      } else if (e.key === 'Escape') {
        cancelChange()
      }
    },
    [applyUrlChanges, cancelChange]
  )

  const inputElRef = React.useRef<HTMLInputElement | null>(null)
  const inputRef = React.useCallback(
    (e: HTMLInputElement | null) => {
      if (e !== null) {
        inputElRef.current = e
        inputElRef.current.addEventListener('keydown', onKeyDown)
      } else {
        inputElRef.current?.removeEventListener('keydown', onKeyDown)
        inputElRef.current = null
      }
    },
    [onKeyDown]
  )

  const updateLinkUI = React.useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection)
      const parent = node.getParent()
      if ($isLinkNode(parent)) {
        setRect(getSelectionRectangle(editor))
        setUrl(parent.getURL())
        setInitialUrl(parent.getURL())
        setEditMode(false)
        setOpen(true)
      } else if ($isLinkNode(node)) {
        setRect(getSelectionRectangle(editor))
        setUrl(node.getURL())
        setInitialUrl(node.getURL())
        setEditMode(false)
        setOpen(true)
      } else {
        setUrl(null)
        setEditMode(false)
        setRect(null)
      }
    } else {
      setUrl(null)
      setEditMode(false)
    }
  }, [editor])

  React.useEffect(() => {
    const update = () => {
      editor.getEditorState().read(() => {
        updateLinkUI()
      })
    }

    window.addEventListener('resize', update)
    // TODO: get the right scroller
    window.addEventListener('scroll', update)

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
    }
  }, [editor, updateLinkUI])

  React.useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateLinkUI()
        })
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateLinkUI()
          return true
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_MODIFIER_COMMAND,
        (event) => {
          // TODO: handle windows
          if (event.key === 'k' && event.metaKey) {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              const node = getSelectedNode(selection)
              const parent = node.getParent()
              if ($isLinkNode(parent)) {
                setEditMode(true)
              } else if ($isLinkNode(node)) {
                setRect(getSelectionRectangle(editor))
                setUrl(node.getURL())
                setInitialUrl(node.getURL())
                setEditMode(true)
                setOpen(true)
              } else {
                setRect(getSelectionRectangle(editor))
                setUrl('')
                setInitialUrl(null)
                setEditMode(true)
                setOpen(true)
              }
            }
            return true
          }
          return false
        },
        COMMAND_PRIORITY_HIGH
      )
    )
  }, [editor, updateLinkUI])

  React.useEffect(() => {
    editor.getEditorState().read(() => {
      updateLinkUI()
    })
  }, [editor, updateLinkUI])

  const [copyUrlTooltipOpen, setCopyUrlTooltipOpen] = React.useState(false)

  return (
    <Popover.Root open={open && !!rect}>
      <Popover.Anchor asChild>
        <div
          style={{
            position: 'absolute',
            top: `${rect?.top}px`,
            left: `${rect?.left}px`,
            width: `${rect?.width}px`,
            height: `${rect?.height}px`,
          }}
        />
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content className="PopoverContent" sideOffset={5} onOpenAutoFocus={(e) => e.preventDefault()}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {editMode ? (
              <input className="LinkUIInput Input" value={url || ''} ref={inputRef} onChange={(e) => setUrl(e.target.value)} autoFocus />
            ) : (
              <a
                href={url!}
                target="_blank"
                rel="noreferrer"
                title={url!}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="LinkTextContainer">{url}</span>
                <ExternalLinkIcon />
              </a>
            )}
          </div>
          <div className="PopoverButtons">
            {editMode ? (
              <>
                <button onClick={() => applyUrlChanges(inputElRef.current!)} title="Set URL" aria-label="Set URL">
                  <CheckIcon />
                </button>

                <button onClick={cancelChange} title="Cancel change" aria-label="Cancel change">
                  <Cross2Icon />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditMode((v) => !v)} title="Edit link URL" aria-label="Edit link URL">
                  <Pencil1Icon />
                </button>
                <Tooltip.Provider>
                  <Tooltip.Root open={copyUrlTooltipOpen}>
                    <Tooltip.Trigger asChild>
                      <button
                        title="Copy to clipboard"
                        aria-label="Copy link URL"
                        onClick={() => {
                          void window.navigator.clipboard.writeText(url!).then(() => {
                            setCopyUrlTooltipOpen(true)
                            setTimeout(() => setCopyUrlTooltipOpen(false), 1000)
                          })
                        }}
                      >
                        {copyUrlTooltipOpen ? <CheckIcon /> : <ClipboardCopyIcon />}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="TooltipContent" sideOffset={5}>
                        Copied!
                        <Tooltip.Arrow className="TooltipArrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>

                <button
                  title="Remove link"
                  aria-label="Remove link"
                  onClick={() => {
                    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
                  }}
                >
                  <LinkBreak1Icon />
                </button>
              </>
            )}
          </div>
          <Popover.Arrow className="PopoverArrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
