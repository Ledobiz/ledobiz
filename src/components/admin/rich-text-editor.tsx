"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type ReactNode, useEffect } from "react";
import { cx } from "@/components/admin/ui";

type Props = {
  id: string;
  /** Editor HTML. Plain text should go through textToHtml first. */
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  /** Minimum height of the writing area, e.g. "min-h-[360px]". */
  minHeight?: string;
  label: string;
};

/**
 * The email editor: bold, italic, underline, headings, lists, quotes and links.
 * Only these survive on the server (see rich-email.ts), so the toolbar offers nothing else.
 */
export function RichTextEditor({ id, value, onChange, disabled = false, minHeight = "min-h-[220px]", label }: Props) {
  const editor = useEditor({
    // Rendered on the client only, so the server and browser HTML match.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["mailto", "tel"] },
      }),
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        class: cx("rich-text px-3.5 py-3 text-[15px] leading-[23px] text-midnight outline-none", minHeight),
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  // Keep the editor in step when the value changes from outside (an AI draft, "Regenerate").
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            underline: current.isActive("underline"),
            h2: current.isActive("heading", { level: 2 }),
            h3: current.isActive("heading", { level: 3 }),
            bullets: current.isActive("bulletList"),
            numbers: current.isActive("orderedList"),
            quote: current.isActive("blockquote"),
            link: current.isActive("link"),
            canUndo: current.can().undo(),
            canRedo: current.can().redo(),
          }
        : null,
  });

  function editLink() {
    if (!editor) {
      return;
    }
    const current = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link address (leave empty to remove the link)", current ?? "https://");
    if (href === null) {
      return;
    }
    if (href.trim() === "" || href.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
    }
  }

  const chain = () => editor?.chain().focus();
  return (
    <div className={cx("overflow-hidden rounded-lg border border-control bg-white focus-within:border-midnight", disabled && "bg-surface")}>
      <div role="toolbar" aria-label="Formatting" aria-controls={id} className="flex flex-wrap gap-0.5 border-b border-line bg-[#fbfcfe] px-1.5 py-1">
        <Tool label="Bold (Ctrl+B)" active={state?.bold} disabled={disabled} onClick={() => chain()?.toggleBold().run()}><strong>B</strong></Tool>
        <Tool label="Italic (Ctrl+I)" active={state?.italic} disabled={disabled} onClick={() => chain()?.toggleItalic().run()}><em className="font-serif">I</em></Tool>
        <Tool label="Underline (Ctrl+U)" active={state?.underline} disabled={disabled} onClick={() => chain()?.toggleUnderline().run()}><span className="underline">U</span></Tool>
        <Divider />
        <Tool label="Heading" active={state?.h2} disabled={disabled} onClick={() => chain()?.toggleHeading({ level: 2 }).run()}>H2</Tool>
        <Tool label="Small heading" active={state?.h3} disabled={disabled} onClick={() => chain()?.toggleHeading({ level: 3 }).run()}>H3</Tool>
        <Divider />
        <Tool label="Bulleted list" active={state?.bullets} disabled={disabled} onClick={() => chain()?.toggleBulletList().run()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" /><circle cx="4.5" cy="18" r="1" fill="currentColor" /></svg>
        </Tool>
        <Tool label="Numbered list" active={state?.numbers} disabled={disabled} onClick={() => chain()?.toggleOrderedList().run()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true"><path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 14.5a1.5 1.5 0 0 1 2.6-1c.6.7 0 1.5-.6 2L3.5 17.5h3" /></svg>
        </Tool>
        <Tool label="Quote" active={state?.quote} disabled={disabled} onClick={() => chain()?.toggleBlockquote().run()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true"><path d="M5 6v12M10 8h9M10 12h9M10 16h6" /></svg>
        </Tool>
        <Tool label="Link" active={state?.link} disabled={disabled} onClick={editLink}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
        </Tool>
        <Divider />
        <Tool label="Clear formatting" disabled={disabled} onClick={() => chain()?.unsetAllMarks().clearNodes().run()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true"><path d="M6 5h12M12 5 9 19M4 4l16 16" /></svg>
        </Tool>
        <span className="ml-auto flex gap-0.5">
          <Tool label="Undo (Ctrl+Z)" disabled={disabled || !state?.canUndo} onClick={() => chain()?.undo().run()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>
          </Tool>
          <Tool label="Redo (Ctrl+Shift+Z)" disabled={disabled || !state?.canRedo} onClick={() => chain()?.redo().run()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h3" /></svg>
          </Tool>
        </span>
      </div>
      {editor ? <EditorContent editor={editor} /> : <div aria-hidden="true" className={cx("px-3.5 py-3", minHeight)} />}
    </div>
  );
}

function Tool({ label, active = false, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keeps the text selection while clicking the toolbar.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cx("inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-[13px] font-medium text-midnight hover:bg-[#e8ecf3] disabled:cursor-not-allowed disabled:opacity-40", active && "bg-[#dde3ee]")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 my-1.5 w-px bg-line" />;
}
