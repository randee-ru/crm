import type { AuthUser } from "@/lib/types";

type UserAvatarProps = {
  user: Pick<AuthUser, "initials" | "avatar_url" | "display_name">;
  size?: "sm" | "md" | "lg";
  className?: string;
  imageClassName?: string;
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-[11px]",
  lg: "h-16 w-16 text-xl",
} as const;

export function UserAvatar({
  user,
  size = "md",
  className = "",
  imageClassName = "",
}: UserAvatarProps) {
  const sizeClass = sizeClasses[size];

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.display_name}
        className={`shrink-0 rounded-full object-cover ${sizeClass} ${imageClassName} ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-bold text-[var(--accent-strong)] ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      {user.initials}
    </span>
  );
}
