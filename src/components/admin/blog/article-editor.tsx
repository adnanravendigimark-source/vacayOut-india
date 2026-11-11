"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { mergeAttributes, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import HeadingExtension, { type Level } from "@tiptap/extension-heading";
import LinkExtension from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { ImageDialog, LinkDialog, type ImageDialogData } from "./dialogs";

/**
 * Rich-text editor for blog articles (Tiptap / ProseMirror). Pasting from Word, Google Docs or
 * another site keeps headings, lists and tables. The HTML it produces is cleaned again on the
 * server before it is stored (src/lib/blog/html.ts).
 */

function normalizeUrl(raw: string) {
  const url = raw.trim();
  if (!url || /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(url)) return url;
  return `https://${url}`;
}

/** The post title is the page's H1, so pasted H1s become H2 and H4–H6 become H3 instead of being lost. */
const Heading = HeadingExtension.extend({
  parseHTML() {
    return [1, 2, 3, 4, 5, 6].map((tag) => ({ tag: `h${tag}`, attrs: { level: tag <= 2 ? 2 : 3 } }));
  },
});

/** Per-link target and rel, so "new tab" and "nofollow" are chosen link by link. */
const Link = LinkExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      target: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("target"), renderHTML: (a: Record<string, unknown>) => (a.target ? { target: a.target } : {}) },
      rel: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("rel"), renderHTML: (a: Record<string, unknown>) => (a.rel ? { rel: a.rel } : {}) },
    };
  },
});

/** A captioned image: <figure><img/><figcaption>…</figcaption></figure>. Plain images use the Image extension. */
const Figure = Node.create({
  name: "figure",
  group: "block",
  content: "inline*",
  isolating: true,
  addAttributes() {
    return { src: { default: null }, alt: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "figure",
        contentElement: "figcaption",
        getAttrs: (el: HTMLElement | string) => {
          if (typeof el === "string") return false;
          const img = el.querySelector("img");
          return img ? { src: img.getAttribute("src"), alt: img.getAttribute("alt") || "" } : false;
        },
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes), ["img", { src: node.attrs.src, alt: node.attrs.alt || "" }], ["figcaption", 0]];
  },
});

function Btn({ label, title, active = false, onClick }: { label: React.ReactNode; title: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-xs font-semibold transition ${active ? "bg-ink text-white shadow-sm" : "text-ink/70 hover:bg-sand hover:text-ink"}`}
    >
      {label}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-4 w-px bg-line" aria-hidden />;

function formatLabel(ed: Editor) {
  if (ed.isActive("heading", { level: 2 })) return "Heading 2 (H2)";
  if (ed.isActive("heading", { level: 3 })) return "Heading 3 (H3)";
  if (ed.isActive("bulletList")) return "Bullet List";
  if (ed.isActive("orderedList")) return "Numbered List";
  if (ed.isActive("blockquote")) return "Quote";
  if (ed.isActive("table")) return "Table";
  return "Paragraph (P)";
}

export function ArticleEditor({ value, onChange, placeholder, minHeight = "26rem", stickyOffset = "0" }: { value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: string; stickyOffset?: string }) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [imageDialog, setImageDialog] = useState<{ pos: number | null; data?: ImageDialogData } | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ url: string } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    content: value || "",
    editorProps: {
      attributes: { class: "tiptap rich-content max-w-none px-4 py-3 text-[0.9375rem] text-ink outline-none [&_img]:cursor-pointer [&_figure]:cursor-pointer", "aria-label": "Article content" },
      handleClickOn: (_view, pos, node) => {
        if (node.type.name === "image") {
          setImageDialog({ pos, data: { url: node.attrs.src || "", alt: node.attrs.alt || "", caption: "" } });
          return true;
        }
        if (node.type.name === "figure") {
          setImageDialog({ pos, data: { url: node.attrs.src || "", alt: node.attrs.alt || "", caption: node.textContent || "" } });
          return true;
        }
        return false;
      },
    },
    extensions: [
      StarterKit.configure({ heading: false, link: false, codeBlock: false, code: false }),
      Heading.configure({ levels: [2, 3] as Level[] }),
      // No site-wide target/rel: each link gets exactly what the link dialog chose.
      Link.configure({ openOnClick: false, autolink: false, HTMLAttributes: { target: null, rel: null } }),
      Image,
      Figure,
      Placeholder.configure({ placeholder: placeholder || "Write here…" }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    onUpdate: ({ editor: ed }) => onChangeRef.current(ed.getHTML()),
  });

  if (!editor) {
    return (
      <div className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-muted" style={{ minHeight }}>
        Loading editor…
      </div>
    );
  }

  const replaceAt = (pos: number, content: Record<string, unknown>) => {
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).insertContentAt(pos, content).run();
  };

  const saveImage = (d: ImageDialogData) => {
    const caption = d.caption.trim();
    const content = caption ? { type: "figure", attrs: { src: d.url, alt: d.alt }, content: [{ type: "text", text: caption }] } : { type: "image", attrs: { src: d.url, alt: d.alt } };
    if (imageDialog?.pos != null) replaceAt(imageDialog.pos, content);
    else editor.chain().focus().insertContent(content).run();
    setImageDialog(null);
  };

  const deleteImage = () => {
    const pos = imageDialog?.pos;
    if (pos == null) return;
    const node = editor.state.doc.nodeAt(pos);
    if (node) editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
    setImageDialog(null);
  };

  const insertLink = ({ url, nofollow, newTab }: { url: string; nofollow: boolean; newTab: boolean }) => {
    const href = normalizeUrl(url);
    const rel = [nofollow ? "nofollow" : "", newTab ? "noopener noreferrer" : ""].filter(Boolean).join(" ") || null;
    const attrs = { href, target: newTab ? "_blank" : null, rel };
    const { from, to } = editor.state.selection;
    if (from === to && !editor.isActive("link")) editor.chain().focus().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs }] }).run();
    else editor.chain().focus().extendMarkRange("link").setLink(attrs).run();
    setLinkDialog(null);
  };

  const inTable = editor.isActive("table");
  const c = () => editor.chain().focus();

  return (
    <div className="rounded-lg border border-line bg-white focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
      <div className="sticky z-10 flex flex-wrap items-center justify-between gap-1 rounded-t-lg border-b border-line bg-canvas p-1.5" style={{ top: stickyOffset }} role="toolbar" aria-label="Formatting">
        <div className="flex flex-wrap items-center gap-0.5">
          <Btn label="H2" title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()} />
          <Btn label="H3" title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()} />
          <Btn label="P" title="Paragraph (normal text)" active={editor.isActive("paragraph")} onClick={() => c().setParagraph().run()} />
          <Sep />
          <Btn label={<span className="font-bold">B</span>} title="Bold" active={editor.isActive("bold")} onClick={() => c().toggleBold().run()} />
          <Btn label={<span className="italic">I</span>} title="Italic" active={editor.isActive("italic")} onClick={() => c().toggleItalic().run()} />
          <Btn label={<span className="underline">U</span>} title="Underline" active={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()} />
          <Sep />
          <Btn label="• List" title="Bullet list" active={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()} />
          <Btn label="1. List" title="Numbered list" active={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()} />
          <Btn label="❝ Quote" title="Quote" active={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()} />
          <Sep />
          <Btn label="Link" title="Insert link" active={editor.isActive("link")} onClick={() => setLinkDialog({ url: (editor.getAttributes("link").href as string) || "" })} />
          <Btn label="Image" title="Insert image" onClick={() => setImageDialog({ pos: null })} />
          <Btn label="Table" title="Insert 3×3 table" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
          {inTable ? (
            <>
              <Sep />
              <Btn label="+Row" title="Add row below" onClick={() => c().addRowAfter().run()} />
              <Btn label="+Col" title="Add column after" onClick={() => c().addColumnAfter().run()} />
              <Btn label="-Row" title="Delete current row" onClick={() => c().deleteRow().run()} />
              <Btn label="-Col" title="Delete current column" onClick={() => c().deleteColumn().run()} />
              <Btn label="Del Table" title="Delete table" onClick={() => c().deleteTable().run()} />
            </>
          ) : null}
          <Sep />
          <Btn label="Clear" title="Clear formatting" onClick={() => c().unsetAllMarks().clearNodes().run()} />
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-muted">
          <span className="size-2 rounded-full bg-coral" aria-hidden />
          <span>Current:</span>
          <span className="font-semibold text-ink">{formatLabel(editor)}</span>
        </div>
      </div>
      <EditorContent editor={editor} style={{ minHeight }} />
      {imageDialog ? <ImageDialog initial={imageDialog.data} onSave={saveImage} onDelete={imageDialog.data ? deleteImage : undefined} onClose={() => setImageDialog(null)} /> : null}
      {linkDialog ? (
        <LinkDialog
          initialUrl={linkDialog.url}
          onInsert={insertLink}
          onRemove={editor.isActive("link") ? () => (editor.chain().focus().extendMarkRange("link").unsetLink().run(), setLinkDialog(null)) : undefined}
          onClose={() => setLinkDialog(null)}
        />
      ) : null}
    </div>
  );
}
