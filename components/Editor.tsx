/**
 * @typedef {import('mdast-util-mdx')}
 */
import { $getRoot, EditorState, ParagraphNode } from 'lexical'
import { useCallback, useEffect, useState } from 'react'

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { LinkPlugin as LexicalLinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'

import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import ToolbarDemo from './Toolbar'
import { TRANSFORMERS } from '@lexical/markdown'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkUIPlugin } from './LinkUIPlugin'

import { exportMarkdownFromLexical, importMarkdownToLexical } from '../lib/markdownImportExport'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { ImageNode } from '../lib/ImageNode'

const initialMarkdown = `
some \`inlineVariable\` code

[A link](https://google.com/ "Googl Title")

# Hello 

 - bullet 1 *something*
 - bullet 2, **bold** some more text
    - nested bullet
    - nested bullet 2

1. item 1
2. item 2

World Some **nested *formatting* text some more <u>un *derl* ine</u>**.

And *some italic with nested **bold** text*.

> Quote with **bold** and *italic* text.
> and some more.

## ... and now

Alt heading
-----------

And some paragraph.

\`\`\`js
const hello = 'world'
\`\`\`

![Shiprock, New Mexico by Beau Rogers](https://web-dev.imgix.net/image/admin/OIF2VcXp8P6O7tQvw53B.jpg?auto=format&w=1600)
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

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error: Error) {
  console.error(error)
}

function convertLexicalStateToMarkdown(state: EditorState) {
  return new Promise<string>((resolve) => {
    state.read(() => {
      resolve(exportMarkdownFromLexical($getRoot()))
    })
  })
}

function MarkdownResult() {
  const [editor] = useLexicalComposerContext()
  const [outMarkdown, setOutMarkdown] = useState('')
  useEffect(() => {
    convertLexicalStateToMarkdown(editor.getEditorState())
      .then((markdown) => {
        setOutMarkdown(markdown)
      })
      .catch((rejection) => console.warn({ rejection }))
  })

  const onChange = useCallback(() => {
    convertLexicalStateToMarkdown(editor.getEditorState())
      .then((markdown) => {
        setOutMarkdown(markdown)
      })
      .catch((rejection) => console.warn({ rejection }))
  }, [editor])

  return (
    <>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1 }}>
          <h3>Result markdown</h3>
          <OnChangePlugin onChange={onChange} />

          <code>
            <pre>{outMarkdown.trim()}</pre>
          </code>
        </div>
        <div style={{ flex: 1 }}>
          <h3>Initial markdown</h3>
          <code>
            <pre>{initialMarkdown.trim()}</pre>
          </code>
        </div>
      </div>
    </>
  )
}

export function Editor() {
  const initialConfig = {
    editorState: () => {
      importMarkdownToLexical($getRoot(), initialMarkdown)
    },
    namespace: 'MyEditor',
    theme,
    nodes: [ParagraphNode, LinkNode, HeadingNode, QuoteNode, CodeNode, ListNode, ListItemNode, HorizontalRuleNode, ImageNode],
    onError,
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <LinkUIPlugin />
      <RichTextPlugin
        contentEditable={
          <>
            <ToolbarDemo />
            <ContentEditable className="EditorContentEditable" />
          </>
        }
        placeholder={<div></div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <hr />
      <hr />
      <LexicalLinkPlugin />
      <ListPlugin />
      <TabIndentationPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <HistoryPlugin />
      <MarkdownResult />
    </LexicalComposer>
  )
}
