import { BRAND_LOGO_SRC } from "@/lib/brand";

type Props = {
  className?: string;
  alt?: string;
};

export function BrandMark({ className, alt }: Props) {
  return (
    <span className={className} aria-hidden={alt ? undefined : true}>
      <img src={BRAND_LOGO_SRC} alt={alt ?? ""} className="brand-mark" />
    </span>
  );
}
