import Image from "next/image";

export function BrandMark({
  size = 40,
  className = ""
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-[22%] bg-[#fbf8f4] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/brand/ledger-logo-wine.png"
        alt=""
        fill
        priority={size <= 44}
        sizes={`${size}px`}
        className="scale-[1.62] object-cover"
      />
    </span>
  );
}
