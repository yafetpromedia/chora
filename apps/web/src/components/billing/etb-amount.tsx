import { BirrSymbol } from "@/components/billing/birr-symbol";
import { formatEtbNumber } from "@/lib/currency";

type Props = {
  /** Amount in cents (e.g. fee balance). */
  cents?: number;
  /** Whole birr amount when not stored as cents. */
  amount?: number;
  maximumFractionDigits?: number;
  className?: string;
  symbolSize?: number;
};

export function EtbAmount({
  cents,
  amount,
  maximumFractionDigits = 2,
  className,
  symbolSize = 14,
}: Props) {
  const birr = cents !== undefined ? cents / 100 : amount ?? 0;

  return (
    <span className={className ? `etb-amount ${className}` : "etb-amount"}>
      <span className="etb-amount__value">
        {formatEtbNumber(birr, { maximumFractionDigits })}
      </span>
      <BirrSymbol size={symbolSize} className="etb-amount__symbol" />
    </span>
  );
}
