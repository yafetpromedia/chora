/** Ethiopian Birr (ETB) currency symbol */
export function BirrSymbol({
  size = 22,
  className,
  bold = false,
}: {
  size?: number;
  className?: string;
  bold?: boolean;
}) {
  const classes = [
    "bill-birr-mark",
    bold ? "bill-birr-mark--bold" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/currency/ethiopian-birr-symbol.png"
      alt=""
      width={size}
      height={size}
      className={classes}
      style={{ width: size, height: size, minWidth: size }}
      aria-hidden
      draggable={false}
    />
  );
}