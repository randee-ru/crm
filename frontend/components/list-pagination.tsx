"use client";

import { IconChevronLeft, IconChevronRight } from "@/components/ui/app-icon";

type ListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
}: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="list-pagination" aria-label="Навигация по страницам">
      <button
        type="button"
        className="list-pagination-btn"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <IconChevronLeft size={14} />
        Назад
      </button>

      <span className="list-pagination-meta">
        Страница <strong>{page}</strong> из {totalPages}
      </span>

      <button
        type="button"
        className="list-pagination-btn"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Вперёд
        <IconChevronRight size={14} />
      </button>
    </nav>
  );
}
