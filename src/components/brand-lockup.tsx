import Image from "next/image";
import Link from "next/link";

export function BrandLockup({
  href = "/",
  subtitle = "Dragon boat festival",
  compact = false,
}: {
  href?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-3 text-slate-950">
      <Image
        src="/dbf-logo.svg"
        alt=""
        width={compact ? 64 : 92}
        height={compact ? 42 : 60}
        className={compact ? "h-10 w-16 object-contain" : "h-14 w-[5.75rem] object-contain"}
      />
      <span>
        <span className="block font-bold leading-tight text-brand-700">PaddlePass</span>
        <span className="block text-xs font-semibold uppercase text-[#f4311f]">{subtitle}</span>
      </span>
    </Link>
  );
}
