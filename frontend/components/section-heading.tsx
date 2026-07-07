type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-3xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-[var(--text)]">
        {title}
      </h2>
      <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">{description}</p>
    </div>
  );
}
