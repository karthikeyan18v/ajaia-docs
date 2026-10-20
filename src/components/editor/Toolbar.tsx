'use client';

import { useEditorState, type Editor } from '@tiptap/react';
import type { ReactNode } from 'react';

type Block = 'p' | 1 | 2 | 3;

// mousedown preventDefault keeps focus (and the phone keyboard) in the editor.
function ToolButton({
  label,
  shortcut,
  active,
  disabled,
  onRun,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onRun: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active ?? undefined}
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onRun}
      className={
        'grid h-9 min-w-9 shrink-0 place-items-center rounded-[var(--radius-control)] px-2 text-[14px] transition-colors duration-150 max-sm:h-11 max-sm:min-w-11 ' +
        'disabled:opacity-35 disabled:hover:bg-transparent ' +
        (active ? 'bg-mark text-ink' : 'text-ink-soft hover:bg-line/60 hover:text-ink')
      }
    >
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />;

const mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

export function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      block: (e.isActive('heading', { level: 1 })
        ? 1
        : e.isActive('heading', { level: 2 })
          ? 2
          : e.isActive('heading', { level: 3 })
            ? 3
            : 'p') as Block,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const setBlock = (b: Block) => (b === 'p' ? chain().setParagraph().run() : chain().setHeading({ level: b }).run());

  return (
    <div role="toolbar" aria-label="Formatting" className="flex items-center justify-start gap-0.5 overflow-x-auto overscroll-x-contain sm:justify-center">
      <ToolButton label="Undo" shortcut={`${mod}+Z`} disabled={!s.canUndo} onRun={() => chain().undo().run()}>
        <Icon d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />
      </ToolButton>
      <ToolButton label="Redo" shortcut={`${mod}+Shift+Z`} disabled={!s.canRedo} onRun={() => chain().redo().run()}>
        <Icon d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" />
      </ToolButton>
      <Divider />
      {(['p', 1, 2, 3] as Block[]).map((b) => (
        <ToolButton
          key={b}
          label={b === 'p' ? 'Normal text' : `Heading ${b}`}
          shortcut={b === 'p' ? `${mod}+Alt+0` : `${mod}+Alt+${b}`}
          active={s.block === b}
          onRun={() => setBlock(b)}
        >
          <span className={b === 'p' ? 'font-serif' : 'font-semibold'}>{b === 'p' ? 'Text' : `H${b}`}</span>
        </ToolButton>
      ))}
      <Divider />
      <ToolButton label="Bold" shortcut={`${mod}+B`} active={s.bold} onRun={() => chain().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton label="Italic" shortcut={`${mod}+I`} active={s.italic} onRun={() => chain().toggleItalic().run()}>
        <span className="font-serif italic">I</span>
      </ToolButton>
      <ToolButton label="Underline" shortcut={`${mod}+U`} active={s.underline} onRun={() => chain().toggleUnderline().run()}>
        <span className="underline underline-offset-2">U</span>
      </ToolButton>
      <Divider />
      <ToolButton label="Bulleted list" shortcut={`${mod}+Shift+8`} active={s.bullet} onRun={() => chain().toggleBulletList().run()}>
        <Icon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
      </ToolButton>
      <ToolButton label="Numbered list" shortcut={`${mod}+Shift+7`} active={s.ordered} onRun={() => chain().toggleOrderedList().run()}>
        <Icon d="M10 6h10M10 12h10M10 18h10M4 5h1v4M4 9h2M4 14.5c0-.8.7-1.5 1.5-1.5S7 13.7 7 14.5c0 1-3 2-3 3.5h3" />
      </ToolButton>
      <Divider />
      <ToolButton label="Add page" shortcut={`${mod}+Enter`} onRun={() => chain().setPageBreak().run()}>
        <span className="flex items-center gap-1.5 px-0.5 text-[13px]">
          <Icon d="M7 3h7l4 4v5M7 3a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h5M14 3v4h4M17 15v6M14 18h6" />
          <span className="max-sm:hidden">Page</span>
        </span>
      </ToolButton>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
