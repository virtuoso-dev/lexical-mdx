import { describe, expect, it } from 'vitest'
import { initializeUnitTest } from './lexical-utils'
import { $getRoot, $createParagraphNode, $createTextNode, LexicalEditor } from 'lexical'

import { importMarkdownToLexical, VISITORS, exportMarkdownFromLexical } from '../lib/markdownImportExport'
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

describe('importing markdown into lexical', () => {
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

    it('supports inline code', () => {
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, 'Hello `const` World')
    })

    it('supports links', () => {
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, `[Virtuoso](https://virtuoso.dev/) World`)
    })

    it('supports headings', () => {
      const md = `
# Hello

## World
`
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, md)
    })

    it('supports markdown nested formatting', () => {
      const md = `
* Hello <u>World</u> **bold**
* World
  * Nested
  * Unordered list

1. Point 1
2. Point 2
`
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, md)
    })

    it('supports markdown blockquotes', () => {
      const md = `
Hello!

> Hello *bold* World
> Virtuoso

Line
`

      testIdenticalMarkdownAfterImportExport(testEnv.editor!, md)
    })

    it('supports code blocks', () => {
      const md = `
Hello Js!

\`\`\`js
const hello = 'world'
\`\`\`
`

      testIdenticalMarkdownAfterImportExport(testEnv.editor!, md)
    })

    it('supports horizontal rules (thematic breaks)', () => {
      const md = `
Try to put a blank line before...

***

...and after a horizontal rule.
`

      testIdenticalMarkdownAfterImportExport(testEnv.editor!, md)
    })
    it('supports images', () => {
      const md = `
      ![The San Juan Mountains are beautiful!](/assets/images/san-juan-mountains.jpg "San Juan Mountains")
      `
      testIdenticalMarkdownAfterImportExport(testEnv.editor!, md)
    })
  })
  // images
})
