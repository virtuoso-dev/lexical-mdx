import { describe, expect, it } from 'vitest'
import { initializeUnitTest } from './lexical-utils'
import {
  $isRootNode,
  $isParagraphNode,
  LexicalNode,
  RootNode as LexicalRootNode,
  ElementNode as LexicalElementNode,
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  $isTextNode,
  TextNode,
  LexicalEditor,
} from 'lexical'

import { traverseLexicalTree, importMarkdownToLexical, VISITORS, exportMarkdownFromLexical } from '../lib/markdownImportExport'
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

describe('loading markdown into lexical', () => {
  initializeUnitTest((testEnv) => {
    it('works with an empty string', () => {
      const { editor } = testEnv
      editor!.update(() => {
        const root = $getRoot()
        importMarkdownToLexical(root, '', VISITORS)
      })

      expect(editor?.getEditorState().toJSON().root).toMatchObject({
        type: 'root',
        children: [],
      })
    })

    it('converts a paragraph into root node with a paragraph > text child', () => {
      const { editor } = testEnv
      editor!.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          expect(editor?.getEditorState().toJSON().root).toMatchObject({
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: 'Hello World' }],
              },
            ],
          })
        })
      })

      editor!.update(() => {
        const root = $getRoot()
        importMarkdownToLexical(root, 'Hello World', VISITORS)
      })
    })
  })
})

describe('converting', () => {
  initializeUnitTest((testEnv) => {
    it('generates root node from a Lexical RootNode', () => {
      const { editor } = testEnv
      editor!.update(() => {
        expect(exportMarkdownFromLexical($getRoot(), VISITORS)).toEqual('')
      })
    })

    it('generates a paragraph from a Lexical ParagraphNode', () => {
      const { editor } = testEnv
      editor!.update(() => {
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('Hello World'))
        $getRoot().append(paragraph)
        expect(exportMarkdownFromLexical($getRoot(), VISITORS)).toEqual('Hello World\n')
      })
    })
  })
})

function testIdenticalMarkdownAfterImportExport(editor: LexicalEditor, markdown: string) {
  editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      expect(exportMarkdownFromLexical($getRoot(), VISITORS).trim()).toEqual(markdown.trim())
    })
  })

  editor.update(() => {
    const root = $getRoot()
    importMarkdownToLexical(root, markdown, VISITORS)
    expect(exportMarkdownFromLexical($getRoot(), VISITORS).trim()).toEqual(markdown.trim())
  })
}
describe('markdown import export', () => {
  initializeUnitTest((testEnv) => {
    it('works with an empty string', () => {
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, '')
    })

    it('works with a simple paragraph', () => {
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, 'Hello World\n')
    })

    it('works with a line break', () => {
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, `Hello\nWorld`)
    })

    it('works with two paragraphs', () => {
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, `Hello\n\nWorld`)
    })
    it('works with italics', () => {
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, `*Hello* World`)
    })
    it('works with strong', () => {
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, `**Hello** World`)
    })

    it('works with underline', () => {
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, `<u>Hello</u> World`)
    })

    it('works with nested crazy formatting', () => {
      const md = `
*Hello **world** some more*

**Hello *world* <u>some</u> more**
`
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, md)
    })
  })
  // inlineCode
  // headings
  // lists
  // blockquotes
  // code blocks
  // horizontal rules
  // links
  // images
})
