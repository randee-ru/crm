import type { ComponentProps } from "react";
import Image from "next/image";
import Link from "next/link";

const sizes = {
  sm: { box: "h-7 w-7", image: 24 },
  md: { box: "h-8 w-8", image: 28 },
  lg: { box: "h-10 w-10", image: 36 },
} as const;

type BrandLogoProps = {
  size?: keyof typeof sizes;
  showTitle?: boolean;
  href?: ComponentProps<typeof Link>["href"];
  className?: string;
  titleClassName?: string;
  onDark?: boolean;
};

export function BrandLogo({
  size = "md",
  showTitle = true,
  href = "/",
  className = "",
  titleClassName = "",
  onDark = false,
}: BrandLogoProps) {
  const { box, image } = sizes[size];

  const content = (
    <>
      <span
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/95 ${box}`}
      >
        <Image
          src="/logo.png"
          alt="CRM Kit"
          width={image}
          height={image}
          className="h-[82%] w-[82%] object-contain"
          priority
        />
      </span>
      {showTitle ? (
        <span
          className={`min-w-0 truncate text-[14px] font-semibold tracking-tight ${
            onDark ? "text-white" : "text-[var(--text)]"
          } ${titleClassName}`}
        >
          CRM Kit
        </span>
      ) : null}
    </>
  );

  const rootClass = `inline-flex min-w-0 items-center gap-2.5 ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={`${rootClass} transition-opacity hover:opacity-90`}>
        {content}
      </Link>
    );
  }

  return <span className={rootClass}>{content}</span>;
}
