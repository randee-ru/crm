"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createDriveFileAction, createDriveFolderAction, deleteDriveItemAction } from "@/app/actions/drive";
import { IconClose, IconDownload, IconFile, IconFolder } from "@/components/ui/app-icon";
import type { DriveBreadcrumbItem, DriveItemRecord } from "@/lib/types";

type DriveWorkspaceProps = {
  items: DriveItemRecord[];
  breadcrumb: DriveBreadcrumbItem[];
  folderId: number | null;
  trashed?: boolean;
  search?: string;
};

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function DriveWorkspace({ items, breadcrumb, folderId, trashed = false, search = "" }: DriveWorkspaceProps) {
  const router = useRouter();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [mode, setMode] = useState<"folder" | "file" | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const folders = items.filter((item) => item.item_type === "folder");
  const files = items.filter((item) => item.item_type === "file");

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "file"
          ? await createDriveFileAction({ name, parentId: folderId, content })
          : await createDriveFolderAction({ name, parentId: folderId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMode(null);
      setName("");
      setContent("");
      setShowAddMenu(false);
      router.refresh();
    });
  };

  const handleDelete = (item: DriveItemRecord) => {
    if (!window.confirm(`Удалить «${item.name}»?`)) return;
    startTransition(async () => {
      const result = await deleteDriveItemAction(item.id);
      if (result.error) setError(result.error);
      router.refresh();
    });
  };

  return (
    <div className="drive-workspace">
      <div className="drive-toolbar">
        <div className="drive-toolbar-left">
          <h1 className="drive-title">Мой Диск</h1>
          <div className="drive-add-wrap">
            <button
              type="button"
              className="drive-add-btn"
              onClick={() => setShowAddMenu((value) => !value)}
            >
              + Добавить
            </button>
            {showAddMenu ? (
              <div className="drive-add-menu">
                <button type="button" onClick={() => { setMode("file"); setShowAddMenu(false); }}>
                  Создать файл
                </button>
                <button type="button" onClick={() => { setMode("folder"); setShowAddMenu(false); }}>
                  Создать папку
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <form className="drive-search" method="get">
          {folderId ? <input type="hidden" name="folder" value={folderId} /> : null}
          <input
            name="search"
            type="search"
            defaultValue={search}
            placeholder="Фильтр + поиск"
            className="drive-search-input"
          />
        </form>
        <div className="drive-toolbar-right">
          <Link
            href={trashed ? "/dashboard/drive" : "/dashboard/drive?trashed=1"}
            className="drive-utility-btn"
          >
            {trashed ? "К диску" : "Корзина"}
          </Link>
        </div>
      </div>

      <div className="drive-breadcrumb">
        {breadcrumb.map((crumb, index) => (
          <span key={`${crumb.id}-${crumb.name}`} className="drive-breadcrumb-item">
            {index > 0 ? <span className="drive-breadcrumb-sep">/</span> : null}
            {crumb.id ? (
              <Link href={`/dashboard/drive?folder=${crumb.id}`}>{crumb.name}</Link>
            ) : (
              <Link href="/dashboard/drive">{crumb.name}</Link>
            )}
          </span>
        ))}
      </div>

      {mode ? (
        <div className="drive-create-panel">
          <h3>{mode === "folder" ? "Создать папку" : "Создать файл"}</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={mode === "folder" ? "Название папки" : "Имя файла.txt"}
            className="drive-create-input"
          />
          {mode === "file" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Содержимое файла"
              className="drive-create-textarea"
              rows={4}
            />
          ) : null}
          {error ? <p className="drive-error">{error}</p> : null}
          <div className="drive-create-actions">
            <button type="button" className="btn-secondary" onClick={() => setMode(null)}>
              Отмена
            </button>
            <button type="button" className="btn-primary" disabled={isPending || !name.trim()} onClick={handleCreate}>
              {isPending ? "Создаём…" : "Создать"}
            </button>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="drive-empty-state">
          <p>В данной папке нет файлов или папок</p>
          <div className="drive-empty-actions">
            <button type="button" className="drive-empty-card" onClick={() => setMode("file")}>
              <span className="drive-empty-icon">
                <IconFile size={24} />
              </span>
              <span>Создать файл</span>
            </button>
            <button type="button" className="drive-empty-card" onClick={() => setMode("folder")}>
              <span className="drive-empty-icon">
                <IconFolder size={24} />
              </span>
              <span>Создать папку</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="drive-items-grid">
          {folders.map((item) => (
            <div key={item.id} className="drive-item-card drive-item-card--folder">
              <Link href={`/dashboard/drive?folder=${item.id}`} className="drive-item-link">
                <span className="drive-item-icon">
                  <IconFolder size={20} />
                </span>
                <span className="drive-item-name">{item.name}</span>
              </Link>
              <button type="button" className="drive-item-delete" onClick={() => handleDelete(item)}>
                <IconClose size={14} />
              </button>
            </div>
          ))}
          {files.map((item) => (
            <div key={item.id} className="drive-item-card">
              <div className="drive-item-link">
                <span className="drive-item-icon">
                  <IconFile size={20} />
                </span>
                <span className="drive-item-name">{item.name}</span>
                <span className="drive-item-meta">{formatSize(item.size_bytes)}</span>
              </div>
              <div className="drive-item-actions">
                {item.download_url ? (
                  <a href={item.download_url} className="drive-item-download" target="_blank" rel="noreferrer">
                    <IconDownload size={14} />
                  </a>
                ) : null}
                <button type="button" className="drive-item-delete" onClick={() => handleDelete(item)}>
                  <IconClose size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
