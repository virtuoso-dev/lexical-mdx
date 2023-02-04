import { describe, it, expect } from 'vitest'
import { toMarkdown } from 'mdast-util-to-markdown'
import { mdxFromMarkdown, mdxToMarkdown } from 'mdast-util-mdx'
import type { Root, Paragraph, Text, Emphasis, Strong } from 'mdast'
import { MdxJsxTextElement } from 'mdast-util-mdx'

import { RootMdxNode, ParagraphMdxNode, UnderlineMdxNode, TextMdxNode, EmphasisMdxNode } from '../components/MdxNodes'

describe('mdx-ast', () => {
  it('should construct the correct tree from a root, paragraph, and a text', () => {
    const root = new RootMdxNode()
    const paragraph = new ParagraphMdxNode()
    const text = new TextMdxNode('Hello, world!')
    root.append(paragraph)
    paragraph.append(text)

    //expect the root to generate the right tree
    expect(root.toTree()).toEqual({
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Hello, world!' }],
        },
      ],
    })
  })

  it('should join two text nodes into one', () => {
    const root = new RootMdxNode()
    const paragraph = new ParagraphMdxNode()
    const text1 = new TextMdxNode('Hello,')
    const text2 = new TextMdxNode(' world!')
    root.append(paragraph)
    paragraph.append(text1)
    paragraph.append(text2)

    //expect the root to generate the right tree
    expect(root.toTree()).toEqual({
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Hello, world!' }],
        },
      ],
    })
  })
  it('should join two emphasis nodes into one', () => {
    const root = new RootMdxNode()
    const paragraph = new ParagraphMdxNode()
    const emphasis1 = new EmphasisMdxNode()
    const emphasis2 = new EmphasisMdxNode()
    root.append(paragraph)
    paragraph.append(emphasis1).append(new TextMdxNode('Hello,'))
    paragraph.append(emphasis2).append(new TextMdxNode(' world!'))

    //expect the root to generate the right tree
    expect(root.toTree()).toEqual({
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'emphasis',
              children: [{ type: 'text', value: 'Hello, world!' }],
            },
          ],
        },
      ],
    })
  })

  it('should convert underline mdx elements to u tags', () => {
    const root = new RootMdxNode()
    const paragraph = new ParagraphMdxNode()
    const underline = new UnderlineMdxNode()
    root.append(paragraph)
    paragraph.append(underline).append(new TextMdxNode('Hello, world!'))

    //expect the root to generate the right tree
    expect(root.toTree()).toEqual({
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'mdxJsxTextElement',
              name: 'u',
              attributes: [],
              children: [{ type: 'text', value: 'Hello, world!' }],
            },
          ],
        },
      ],
    })

    expect(toMarkdown(root.toTree(), { extensions: [mdxToMarkdown()] })).toEqual('<u>Hello, world!</u>\n')
  })
})
