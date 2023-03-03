import React from 'react'
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  RangeSelection,
  SELECTION_CHANGE_COMMAND,
  TextNode,
} from 'lexical'
import { mergeRegister } from '@lexical/utils'

import { $isAtNodeEnd } from '@lexical/selection'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

function getSelectedNode(selection: RangeSelection): TextNode | ElementNode {
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

export function useLexicalSelection() {
  const [selectionRectangle, setSelectionRectangle] = React.useState<DOMRect | null>(null)
  const [selectedNode, setSelectedNode] = React.useState<LexicalNode | null>(null)
  const [editor] = useLexicalComposerContext()

  const reportSelection = React.useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setSelectionRectangle(getSelectionRectangle(editor))
      setSelectedNode(getSelectedNode(selection))
    }
  }, [editor])

  React.useEffect(() => {
    const update = () => {
      editor.getEditorState().read(() => {
        reportSelection()
      })
    }

    update()
    window.addEventListener('resize', update)
    // TODO: get the right scroller
    window.addEventListener('scroll', update)

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
    }
  }, [editor, reportSelection])

  React.useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          reportSelection()
        })
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          reportSelection()
          return true
        },
        COMMAND_PRIORITY_LOW
      )
    )
  }, [editor, reportSelection])

  return { selectionRectangle, selectedNode }
}
