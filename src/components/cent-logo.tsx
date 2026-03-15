export function CentLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={["flex items-center gap-3", className].filter(Boolean).join(" ")}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3b2bee] shadow-xl shadow-[#3b2bee]/20">
        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd" />
        </svg>
      </div>
      {!compact ? <span className="text-3xl font-black tracking-tight text-slate-900">cent</span> : null}
    </div>
  );
}
