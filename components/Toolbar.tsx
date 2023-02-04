import React, { useCallback, useEffect, useState } from 'react'
import * as Toolbar from '@radix-ui/react-toolbar'
import {
  StrikethroughIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  FontBoldIcon,
  FontItalicIcon,
  UnderlineIcon,
} from '@radix-ui/react-icons'
import {
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  TextFormatType,
} from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $findMatchingParent } from '@lexical/utils'
import { $isParentElementRTL } from '@lexical/selection'
import { DEFAULT_FORMAT, IS_BOLD, IS_ITALIC, IS_UNDERLINE, IS_STRIKETHROUGH } from './FormatConstants'

const FormatMap = new Map<number, TextFormatType>([
  [IS_BOLD, 'bold'],
  [IS_ITALIC, 'italic'],
  [IS_UNDERLINE, 'underline'],
  [IS_STRIKETHROUGH, 'strikethrough'],
])

const ToolbarDemo = () => {
  const [editor] = useLexicalComposerContext()
  const [activeEditor, setActiveEditor] = useState(editor)
  const [format, setFormat] = useState(DEFAULT_FORMAT)

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode()
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent()
              return parent !== null && $isRootOrShadowRoot(parent)
            })

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow()
      }

      const elementKey = element.getKey()
      const elementDOM = activeEditor.getElementByKey(elementKey)

      let newFormat = format

      if (selection.hasFormat('bold')) {
        newFormat |= IS_BOLD
      } else {
        newFormat &= ~IS_BOLD
      }

      if (selection.hasFormat('italic')) {
        newFormat |= IS_ITALIC
      } else {
        newFormat &= ~IS_ITALIC
      }

      if (selection.hasFormat('underline')) {
        newFormat |= IS_UNDERLINE
      } else {
        newFormat &= ~IS_UNDERLINE
      }

      if (selection.hasFormat('strikethrough')) {
        newFormat |= IS_STRIKETHROUGH
      } else {
        newFormat &= ~IS_STRIKETHROUGH
      }
      setFormat(newFormat)
    }
  }, [activeEditor, format])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        updateToolbar()
        setActiveEditor(newEditor)
        return false
      },
      COMMAND_PRIORITY_CRITICAL
    )
  }, [editor, updateToolbar])

  const toggleGroupValue = Array.from(FormatMap.keys()).reduce((acc, bit) => {
    if (format & bit) {
      acc.push(bit.toString())
    }
    return acc
  }, [] as string[])

  const timestamp = Date.now()
  return (
    <Toolbar.Root className="ToolbarRoot" aria-label="Formatting options">
      <Toolbar.ToggleGroup
        value={toggleGroupValue}
        type="multiple"
        aria-label="Text formatting"
        onValueChange={(e) => {
          let newFormat = DEFAULT_FORMAT
          e.map((value) => {
            newFormat |= parseInt(value)
          })

          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, FormatMap.get(format ^ newFormat)!)
        }}
      >
        <Toolbar.ToggleItem className="ToolbarToggleItem" value={IS_BOLD.toString()} aria-label="Bold">
          <FontBoldIcon />
        </Toolbar.ToggleItem>
        <Toolbar.ToggleItem className="ToolbarToggleItem" value={IS_ITALIC.toString()} aria-label="Italic">
          <FontItalicIcon />
        </Toolbar.ToggleItem>

        <Toolbar.ToggleItem className="ToolbarToggleItem" value={IS_UNDERLINE.toString()} aria-label="Underline">
          <UnderlineIcon />
        </Toolbar.ToggleItem>
        <Toolbar.ToggleItem className="ToolbarToggleItem" value={IS_STRIKETHROUGH.toString()} aria-label="Strike through">
          <StrikethroughIcon />
        </Toolbar.ToggleItem>
      </Toolbar.ToggleGroup>
      <Toolbar.Separator className="ToolbarSeparator" />
    </Toolbar.Root>
  )
}

export default ToolbarDemo
