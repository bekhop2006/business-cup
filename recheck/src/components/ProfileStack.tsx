"use client";

import { useRef, useState } from "react";

// The profile as a stack of cards. A sticky row of pills folds each card's
// editor open and shut; when folded, a card shows what we'll use.
// Layout idea adapted from "Pocket Portfolio" by Kedhareswer Naidu (MIT).

export type ProfileSection = {
  id: string;
  label: string;
  title: string;
  summary: React.ReactNode;
  editor: React.ReactNode;
};

export function ProfileStack({ sections, defaultOpen }: { sections: ProfileSection[]; defaultOpen: string[] }) {
  const [open, setOpen] = useState<string[]>(defaultOpen);
  const cards = useRef<Record<string, HTMLElement | null>>({});

  const toggle = (id: string) => {
    const opening = !open.includes(id);
    setOpen(opening ? [...open, id] : open.filter((item) => item !== id));
    if (opening) cards.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <nav aria-label="Profile sections" className="sticky top-2 z-10 mt-6 flex gap-2 rounded-full border border-[var(--rc-navy)]/10 bg-[var(--rc-ivory)] p-1.5">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-expanded={open.includes(section.id)}
            aria-controls={`edit-${section.id}`}
            onClick={() => toggle(section.id)}
            className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[var(--rc-navy)]/6 py-1.5 pl-4 pr-2 text-sm transition-colors hover:bg-[var(--rc-navy)]/10 aria-expanded:bg-[var(--rc-accent)]"
          >
            {section.label}
            <PlusMinus open={open.includes(section.id)} />
          </button>
        ))}
      </nav>

      {sections.map((section) => {
        const isOpen = open.includes(section.id);
        return (
          <section
            key={section.id}
            ref={(node) => { cards.current[section.id] = node; }}
            aria-labelledby={`title-${section.id}`}
            className="mt-3 scroll-mt-20 rounded-2xl bg-[var(--rc-navy)]/4 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={`title-${section.id}`} className="font-medium">{section.title}</h2>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`edit-${section.id}`}
                onClick={() => toggle(section.id)}
                className="min-h-0 shrink-0 text-sm underline underline-offset-4"
              >
                {isOpen ? "Close" : "Edit"}
              </button>
            </div>
            <div className="mt-3">{section.summary}</div>
            <div
              id={`edit-${section.id}`}
              inert={!isOpen}
              className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="mt-4 border-t border-[var(--rc-navy)]/10">{section.editor}</div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}

function PlusMinus({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 18 18" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.3} aria-hidden="true">
      <circle cx="9" cy="9" r="8.2" />
      <path d="M5 9h8" strokeLinecap="round" />
      <path
        d="M9 5v8"
        strokeLinecap="round"
        className="origin-center transition-transform duration-300"
        style={{ transform: open ? "rotate(90deg) scaleX(0)" : undefined }}
      />
    </svg>
  );
}
