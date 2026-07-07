"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type CrmKanbanContextMenuProps = {
  x: number;
  y: number;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
  busy?: boolean;
};

const MENU_WIDTH = 196;

export function CrmKanbanContextMenu({
  x,
  y,
  onEdit,
  onCopy,
  onDelete,
  onClose,
  busy = false,
}: CrmKanbanContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const handleScroll = () => onClose();

    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", onClose);

    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - MENU_WIDTH - 12);
  const top = Math.min(y, window.innerHeight - 160);

  return createPortal(
    <div
      ref={menuRef}
      className="crm-kanban-context-menu"
      style={{ left, top }}
      role="menu"
      onContextMenu={(event) => event.preventDefault()}
    >
      <button type="button" className="crm-kanban-context-item" role="menuitem" disabled={busy} onClick={onEdit}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="crm-kanban-context-icon">
          <path
            d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Изменить
      </button>
      <button type="button" className="crm-kanban-context-item" role="menuitem" disabled={busy} onClick={onCopy}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="crm-kanban-context-icon">
          <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        Копировать
      </button>
      <div className="crm-kanban-context-divider" role="separator" />
      <button
        type="button"
        className="crm-kanban-context-item crm-kanban-context-item--danger"
        role="menuitem"
        disabled={busy}
        onClick={onDelete}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="crm-kanban-context-icon">
          <path
            d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Удалить
      </button>
    </div>,
    document.body,
  );
}
