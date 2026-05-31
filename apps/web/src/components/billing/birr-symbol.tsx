/** Official Ethiopian Birr currency symbol (National Bank of Ethiopia) */
export function BirrSymbol({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const height = Math.round(size * 1.28);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/currency/ethiopian-birr-symbol.png"
      alt=""
      width={size}
      height={height}
      className={className ? `bill-birr-mark ${className}` : "bill-birr-mark"}
      aria-hidden
      draggable={false}
    />
  );
}
