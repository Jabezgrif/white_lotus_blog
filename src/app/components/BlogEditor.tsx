'use client';

import { useEditor, EditorContent, EditorContext } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Document from '@tiptap/extension-document'
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { LinkPopover } from '@/components/tiptap-ui/link-popover';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button';
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import Heading from '@tiptap/extension-heading';
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button';
import { Superscript } from '@tiptap/extension-superscript'
import { Subscript } from '@tiptap/extension-subscript'
import Typography from '@tiptap/extension-typography'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import "@/styles/_keyframe-animations.scss";
import "@/styles/_variables.scss";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";
import clsx from 'clsx';

// Import styles
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';

const lowlight = createLowlight();

type BlogEditorProps = {
  content: string;
  onChange: (html: string) => void;
};

export default function BlogEditor({ content, onChange }: BlogEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Superscript,
      Subscript,
      Image,
      Typography,
      Text,
      Document,
      Paragraph,
      Link.configure({ openOnClick: false }),
      CodeBlockLowlight.configure({ lowlight }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Heading.configure({ levels: [1, 2, 3, 4] }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }) // Added highlight extension
    ],
    content,
    editorProps: {
      attributes: {
        class: 'min-h-[200px] prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <EditorContext.Provider value={{ editor }}>
      <div className="space-y-2">
        <Toolbar
          className={clsx(
            "border-b pb-2 bg-white rounded-t-lg flex flex-wrap items-center justify-center gap-2 sm:justify-center"
          )}
        >

          <ToolbarGroup>
            <UndoRedoButton action="undo" />
            <UndoRedoButton action="redo" />
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup>
            <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
            <ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} />
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup>
            <MarkButton type="bold" />
            <MarkButton type="italic" />
            <MarkButton type="strike" />
            <MarkButton type="code" />
            <MarkButton type="underline" />

            <LinkPopover />
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup>
            <MarkButton type="superscript" />
            <MarkButton type="subscript" />
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup>
            <TextAlignButton align="left" />
            <TextAlignButton align="center" />
            <TextAlignButton align="right" />
            <TextAlignButton align="justify" />
          </ToolbarGroup>

        </Toolbar>

        <div className="border rounded-b-lg bg-white px-4 py-3 min-h-[200px] max-w-full sm:max-w-3xl mx-auto ">
          <EditorContent
            editor={editor}
            aria-label="Blog content editor"
            className="simple-editor-content [&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-blue-500 [&_.ProseMirror-selectedtext]:bg-blue-100"
          />
        </div>

      </div>
    </EditorContext.Provider>
  );
}