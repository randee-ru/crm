import type { ReactNode } from "react";

type WorkspaceCardProps = {
  children: ReactNode;
  className?: string;
};

export function WorkspaceCard({ children, className = "" }: WorkspaceCardProps) {
  return <div className={`workspace-card ${className}`.trim()}>{children}</div>;
}
