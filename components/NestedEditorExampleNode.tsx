import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalNestedComposer } from '@lexical/react/LexicalNestedComposer'
import { DecoratorBlockNode, SerializedDecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import {
  $getRoot,
  createEditor,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedEditor,
  Spread,
} from 'lexical'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'

export type SerializedNestedEditorExampleNode = Spread<
  {
    contents: SerializedEditor
    type: 'petyo'
    version: 1
  },
  SerializedDecoratorBlockNode
>

export class NestedEditorExampleNode extends DecoratorBlockNode {
  __contents: LexicalEditor

  constructor(contents?: LexicalEditor, format?: ElementFormatType, key?: NodeKey) {
    super(format, key)
    this.__contents = contents || createEditor()
  }

  static getType(): string {
    return 'petyo'
  }

  static clone(node: NestedEditorExampleNode): NestedEditorExampleNode {
    return new NestedEditorExampleNode(node.__contents, node.__format, node.__key)
  }

  static importJSON(serializedNode: SerializedNestedEditorExampleNode): NestedEditorExampleNode {
    const node = new NestedEditorExampleNode()
    const contents = serializedNode.contents
    const nestedEditor = node.__contents
    const editorState = nestedEditor.parseEditorState(contents.editorState)

    if (!editorState.isEmpty()) {
      nestedEditor.setEditorState(editorState)
    }

    node.setFormat(serializedNode.format)
    return node
  }

  exportJSON(): SerializedNestedEditorExampleNode {
    return {
      ...super.exportJSON(),
      contents: this.__contents.toJSON(),
      type: 'petyo',
      version: 1,
    }
  }

  getTextContent(): string {
    return this.__contents.getEditorState().read(() => {
      console.log('what')
      return 'What?'
    })
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
    return <PetyoComponent contents={this.__contents} />
  }

  isInline(): false {
    return false
  }
}

function PetyoComponent({ contents }: { contents: LexicalEditor }) {
  return (
    <div style={{ border: '1px solid red' }}>
      <hr />
      <LexicalNestedComposer initialEditor={contents}>
        <RichTextPlugin
          contentEditable={<ContentEditable className="StickyNode__contentEditable" />}
          placeholder={<div>some placeholders</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin
          onChange={(state) => {
            console.log(state.read(() => $getRoot().getTextContent()))
          }}
        />
      </LexicalNestedComposer>

      <hr />
    </div>
  )
}

export function $createPetyoNode(): NestedEditorExampleNode {
  return new NestedEditorExampleNode()
}

export function $isPetyoNode(node: NestedEditorExampleNode | LexicalNode | null | undefined): node is NestedEditorExampleNode {
  return node instanceof NestedEditorExampleNode
}
