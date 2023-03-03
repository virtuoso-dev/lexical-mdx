/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * @typedef {import('mdast-util-mdx')}
 */
import React from 'react'
import {
  $getRoot,
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

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { LinkPlugin as LexicalLinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { $isAtNodeEnd } from '@lexical/selection'
import { importMarkdownToLexical, UsedLexicalNodes } from '@virtuoso.dev/lexical-mdx-import-export'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $isLinkNode } from '@lexical/link'

const initialMarkdown = `
[A link](https://google.com/ "Link To Google")

In commodo tempor lorem, id lobortis purus pharetra nec. Morbi sagittis ultricies lectus ut placerat. Praesent vestibulum ligula non sapien efficitur, sit amet viverra est imperdiet. Nam rutrum massa quam, sit amet convallis erat viverra nec. Donec pharetra urna urna, non malesuada orci consequat cursus. Nulla blandit ligula ac leo dictum fermentum. Fusce augue purus, dignissim ut posuere gravida, laoreet eget quam. Nunc porttitor leo sem, eget posuere magna congue ut. Nunc tempus mi quis efficitur accumsan. Ut efficitur, felis eu lacinia finibus, nisl quam ultrices eros, eget scelerisque dolor diam nec turpis. Nam ultricies, sapien auctor condimentum bibendum, metus est maximus neque, id ornare metus eros quis libero. Nulla facilisi.
In commodo tempor lorem, id lobortis purus pharetra nec. Morbi sagittis ultricies lectus ut placerat. Praesent vestibulum ligula non sapien efficitur, sit amet viverra est imperdiet. Nam rutrum massa quam, sit amet convallis erat viverra nec. Donec pharetra urna urna, non malesuada orci consequat cursus. Nulla blandit ligula ac leo dictum fermentum. Fusce augue purus, dignissim ut posuere gravida, laoreet eget quam. Nunc porttitor leo sem, eget posuere magna congue ut. Nunc tempus mi quis efficitur accumsan. Ut efficitur, felis eu lacinia finibus, nisl quam ultrices eros, eget scelerisque dolor diam nec turpis. Nam ultricies, sapien auctor condimentum bibendum, metus est maximus neque, id ornare metus eros quis libero. Nulla facilisi.
In commodo tempor lorem, id lobortis purus pharetra nec. Morbi sagittis ultricies lectus ut placerat. Praesent vestibulum ligula non sapien efficitur, sit amet viverra est imperdiet. Nam rutrum massa quam, sit amet convallis erat viverra nec. Donec pharetra urna urna, non malesuada orci consequat cursus. Nulla blandit ligula ac leo dictum fermentum. Fusce augue purus, dignissim ut posuere gravida, laoreet eget quam. Nunc porttitor leo sem, eget posuere magna congue ut. Nunc tempus mi quis efficitur accumsan. Ut efficitur, felis eu lacinia finibus, nisl quam ultrices eros, eget scelerisque dolor diam nec turpis. Nam ultricies, sapien auctor condimentum bibendum, metus est maximus neque, id ornare metus eros quis libero. Nulla facilisi.
In commodo tempor lorem, id lobortis purus pharetra nec. Morbi sagittis ultricies lectus ut placerat. Praesent vestibulum ligula non sapien efficitur, sit amet viverra est imperdiet. Nam rutrum massa quam, sit amet convallis erat viverra nec. Donec pharetra urna urna, non malesuada orci consequat cursus. Nulla blandit ligula ac leo dictum fermentum. Fusce augue purus, dignissim ut posuere gravida, laoreet eget quam. Nunc porttitor leo sem, eget posuere magna congue ut. Nunc tempus mi quis efficitur accumsan. Ut efficitur, felis eu lacinia finibus, nisl quam ultrices eros, eget scelerisque dolor diam nec turpis. Nam ultricies, sapien auctor condimentum bibendum, metus est maximus neque, id ornare metus eros quis libero. Nulla facilisi.
In commodo tempor lorem, id lobortis purus pharetra nec. Morbi sagittis ultricies lectus ut placerat. Praesent vestibulum ligula non sapien efficitur, sit amet viverra est imperdiet. Nam rutrum massa quam, sit amet convallis erat viverra nec. Donec pharetra urna urna, non malesuada orci consequat cursus. Nulla blandit ligula ac leo dictum fermentum. Fusce augue purus, dignissim ut posuere gravida, laoreet eget quam. Nunc porttitor leo sem, eget posuere magna congue ut. Nunc tempus mi quis efficitur accumsan. Ut efficitur, felis eu lacinia finibus, nisl quam ultrices eros, eget scelerisque dolor diam nec turpis. Nam ultricies, sapien auctor condimentum bibendum, metus est maximus neque, id ornare metus eros quis libero. Nulla facilisi.
In commodo tempor lorem, id lobortis purus pharetra nec. Morbi sagittis ultricies lectus ut placerat. Praesent vestibulum ligula non sapien efficitur, sit amet viverra est imperdiet. Nam rutrum massa quam, sit amet convallis erat viverra nec. Donec pharetra urna urna, non malesuada orci consequat cursus. Nulla blandit ligula ac leo dictum fermentum. Fusce augue purus, dignissim ut posuere gravida, laoreet eget quam. Nunc porttitor leo sem, eget posuere magna congue ut. Nunc tempus mi quis efficitur accumsan. Ut efficitur, felis eu lacinia finibus, nisl quam ultrices eros, eget scelerisque dolor diam nec turpis. Nam ultricies, sapien auctor condimentum bibendum, metus est maximus neque, id ornare metus eros quis libero. Nulla facilisi.

[A link](https://google.com/ "Link To Google")
`

const theme = {
  text: {
    bold: 'PlaygroundEditorTheme__textBold',
    code: 'PlaygroundEditorTheme__textCode',
    italic: 'PlaygroundEditorTheme__textItalic',
    strikethrough: 'PlaygroundEditorTheme__textStrikethrough',
    subscript: 'PlaygroundEditorTheme__textSubscript',
    superscript: 'PlaygroundEditorTheme__textSuperscript',
    underline: 'PlaygroundEditorTheme__textUnderline',
    underlineStrikethrough: 'PlaygroundEditorTheme__textUnderlineStrikethrough',
  },

  list: {
    nested: {
      listitem: 'PlaygroundEditorTheme__nestedListItem',
    },
  },
}

function onError(error: Error) {
  console.error(error)
}

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

function useLexicalSelection() {
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

function SelectionRectanglePlugin() {
  const { selectionRectangle } = useLexicalSelection()
  if (selectionRectangle?.width === 0) {
    return
  }
  return (
    <div
      style={{
        position: 'absolute',
        top: selectionRectangle?.top,
        left: selectionRectangle?.left,
        width: selectionRectangle?.width,
        height: selectionRectangle?.height,
        opacity: 0.5,
        backgroundColor: 'red',
        transform: 'translatey(-30px)',
      }}
    >
      Selection
    </div>
  )
}

export function BasicSetup() {
  const initialConfig = {
    editorState: () => {
      importMarkdownToLexical($getRoot(), initialMarkdown)
    },
    namespace: 'MyEditor',
    theme,
    nodes: UsedLexicalNodes,
    onError,
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin contentEditable={<ContentEditable />} placeholder={<div></div>} ErrorBoundary={LexicalErrorBoundary} />
      <LexicalLinkPlugin />
      <ListPlugin />
      <SelectionRectanglePlugin />
    </LexicalComposer>
  )
}
