"use client";

import { useEffect, useRef, useState } from "react";

import type { DealPipelineRecord } from "@/lib/types";

type CrmDealHeaderFunnelSelectProps = {
  pipelines: DealPipelineRecord[];
  activePipelineId: number;
  disabled?: boolean;
  onSelect: (pipelineId: number) => void;
};

export function CrmDealHeaderFunnelSelect({
  pipelines,
  activePipelineId,
  disabled,
  onSelect,
}: CrmDealHeaderFunnelSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activePipeline =
    pipelines.find((pipeline) => pipeline.id === activePipelineId) ?? pipelines[0];

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!activePipeline) {
    return <span className="crm-deal-header-funnel crm-deal-header-funnel--empty">Нет воронок</span>;
  }

  return (
    <div className="crm-deal-header-funnel-wrap" ref={rootRef}>
      <button
        type="button"
        className="crm-deal-header-funnel"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{activePipeline.name}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="crm-deal-header-funnel-menu" role="menu">
          {pipelines.map((pipeline) => (
            <button
              key={pipeline.id}
              type="button"
              role="menuitem"
              className={`crm-deal-header-funnel-option ${
                pipeline.id === activePipeline.id ? "crm-deal-header-funnel-option--active" : ""
              }`}
              onClick={() => {
                setOpen(false);
                if (pipeline.id !== activePipeline.id) {
                  onSelect(pipeline.id);
                }
              }}
            >
              <span>{pipeline.name}</span>
              {pipeline.is_default ? (
                <span className="crm-deal-header-funnel-badge">по умолчанию</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type CrmDealHeaderTitleProps = {
  dealId: number;
  title: string;
  pipelineId?: number;
  disabled?: boolean;
  onSave: (title: string) => Promise<void>;
};

export function CrmDealHeaderTitle({
  dealId,
  title,
  pipelineId,
  disabled,
  onSave,
}: CrmDealHeaderTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitTitle = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(title);
      setEditing(false);
      return;
    }
    if (trimmed === title) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "kanban");
    url.searchParams.set("deal", String(dealId));
    if (pipelineId) {
      url.searchParams.set("pipeline", String(pipelineId));
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setLinkCopied(false);
    }
  };

  return (
    <div className="crm-deal-header-title-block">
      <div className="crm-deal-header-title-row">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            disabled={saving || disabled}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void commitTitle()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void commitTitle();
              }
              if (event.key === "Escape") {
                event.stopPropagation();
                setDraft(title);
                setEditing(false);
              }
            }}
            className="crm-deal-header-title-input"
            aria-label="Название сделки"
          />
        ) : (
          <h2 id="crm-deal-panel-title" className="crm-deal-header-title">
            {title}
          </h2>
        )}

        <div className="crm-deal-header-tools">
          <button
            type="button"
            className="crm-deal-header-icon-btn"
            aria-label="Редактировать название"
            disabled={disabled || saving}
            onClick={() => setEditing(true)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
              <path
                d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className="crm-deal-header-icon-btn"
            aria-label="Копировать ссылку на сделку"
            disabled={disabled}
            onClick={() => void handleCopyLink()}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
              <path
                d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 7.07 7.07L14 19"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {linkCopied ? <span className="crm-deal-header-copied">Ссылка скопирована</span> : null}
        </div>
      </div>

      <span className="crm-deal-header-id">Сделка #{dealId}</span>
    </div>
  );
}
