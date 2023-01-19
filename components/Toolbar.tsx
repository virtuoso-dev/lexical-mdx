import React, { useCallback, useEffect, useState } from "react";
import * as Toolbar from "@radix-ui/react-toolbar";
import {
  StrikethroughIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  FontBoldIcon,
  FontItalicIcon,
  UnderlineIcon,
} from "@radix-ui/react-icons";
import {
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  TextFormatType,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent } from "@lexical/utils";
import { $isParentElementRTL } from "@lexical/selection";

const DEFAULT_FORMAT = 0b0000;
const BOLD = 0b0001;
const ITALIC = 0b0010;
const UNDERLINE = 0b0100;
const STRIKETHROUGH = 0b1000;

const FormatMap = new Map<number, TextFormatType>([
  [BOLD, "bold"],
  [ITALIC, "italic"],
  [UNDERLINE, "underline"],
  [STRIKETHROUGH, "strikethrough"],
]);

const ToolbarDemo = () => {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [format, setFormat] = useState(DEFAULT_FORMAT);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      let newFormat = format;

      if (selection.hasFormat("bold")) {
        newFormat |= BOLD;
      } else {
        newFormat &= ~BOLD;
      }

      if (selection.hasFormat("italic")) {
        newFormat |= ITALIC;
      } else {
        newFormat &= ~ITALIC;
      }

      if (selection.hasFormat("underline")) {
        newFormat |= UNDERLINE;
      } else {
        newFormat &= ~UNDERLINE;
      }

      if (selection.hasFormat("strikethrough")) {
        newFormat |= STRIKETHROUGH;
      } else {
        newFormat &= ~STRIKETHROUGH;
      }
      setFormat(newFormat);
    }
  }, [activeEditor, format]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        updateToolbar();
        console.log("SELECTION_CHANGE_COMMAND");
        setActiveEditor(newEditor);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, updateToolbar]);

  const toggleGroupValue = Array.from(FormatMap.keys()).reduce((acc, bit) => {
    if (format & bit) {
      acc.push(bit.toString());
    }
    return acc;
  }, [] as string[]);

  const timestamp = Date.now();
  return (
    <Toolbar.Root className="ToolbarRoot" aria-label="Formatting options">
      <Toolbar.ToggleGroup
        value={toggleGroupValue}
        type="multiple"
        aria-label="Text formatting"
        onValueChange={(e) => {
          console.log({ timestamp });
          let newFormat = DEFAULT_FORMAT;
          e.map((value) => {
            newFormat |= parseInt(value);
          });

          console.log(JSON.stringify(FormatMap.get(format ^ newFormat)));
          activeEditor.dispatchCommand(
            FORMAT_TEXT_COMMAND,
            FormatMap.get(format ^ newFormat)!
          );
        }}
      >
        <Toolbar.ToggleItem
          className="ToolbarToggleItem"
          value={BOLD.toString()}
          aria-label="Bold"
        >
          <FontBoldIcon />
        </Toolbar.ToggleItem>
        <Toolbar.ToggleItem
          className="ToolbarToggleItem"
          value={ITALIC.toString()}
          aria-label="Italic"
        >
          <FontItalicIcon />
        </Toolbar.ToggleItem>

        <Toolbar.ToggleItem
          className="ToolbarToggleItem"
          value={UNDERLINE.toString()}
          aria-label="Underline"
        >
          <UnderlineIcon />
        </Toolbar.ToggleItem>
        <Toolbar.ToggleItem
          className="ToolbarToggleItem"
          value={STRIKETHROUGH.toString()}
          aria-label="Strike through"
        >
          <StrikethroughIcon />
        </Toolbar.ToggleItem>
      </Toolbar.ToggleGroup>
      <Toolbar.Separator className="ToolbarSeparator" />
      <Toolbar.ToggleGroup
        type="single"
        defaultValue="center"
        aria-label="Text alignment"
      >
        <Toolbar.ToggleItem
          className="ToolbarToggleItem"
          value="left"
          aria-label="Left aligned"
        >
          <TextAlignLeftIcon />
        </Toolbar.ToggleItem>
        <Toolbar.ToggleItem
          className="ToolbarToggleItem"
          value="center"
          aria-label="Center aligned"
        >
          <TextAlignCenterIcon />
        </Toolbar.ToggleItem>
        <Toolbar.ToggleItem
          className="ToolbarToggleItem"
          value="right"
          aria-label="Right aligned"
        >
          <TextAlignRightIcon />
        </Toolbar.ToggleItem>
      </Toolbar.ToggleGroup>
      <Toolbar.Separator className="ToolbarSeparator" />
      <Toolbar.Link
        className="ToolbarLink"
        href="#"
        target="_blank"
        style={{ marginRight: 10 }}
      >
        Edited 2 hours ago
      </Toolbar.Link>
      <Toolbar.Button className="ToolbarButton" style={{ marginLeft: "auto" }}>
        Share
      </Toolbar.Button>
    </Toolbar.Root>
  );
};

export default ToolbarDemo;
