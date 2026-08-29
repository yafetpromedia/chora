import type { PlatformPayoutInstructions } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  payout?: PlatformPayoutInstructions | null;
};

export function PayoutInstructions({ payout }: Props) {
  if (!payout?.bank && !payout?.telebirr && !payout?.instructions) {
    return (
      <article className="sb-v2__card">
        <h3 className="sb-v2__card-title">How to pay {BRAND_NAME}</h3>
        <p className="sb-v2__card-sub">
          Payment details are not published yet. Contact support
          {payout?.supportEmail ? ` at ${payout.supportEmail}` : ""}
          {payout?.supportPhone ? ` or ${payout.supportPhone}` : ""} with your invoice
          number.
        </p>
      </article>
    );
  }

  return (
    <article className="sb-v2__card">
      <h3 className="sb-v2__card-title">Pay {BRAND_NAME}</h3>
      <p className="sb-v2__card-sub">
        Send the invoice amount to this account, then reply with the transaction ID.
        Access continues after payment is confirmed.
      </p>
      <dl className="sb-v2__payout">
        {payout.telebirr ? (
          <>
            <dt>Telebirr</dt>
            <dd>
              {payout.telebirr.accountName}
              <strong>{payout.telebirr.number}</strong>
            </dd>
          </>
        ) : null}
        {payout.bank ? (
          <>
            <dt>{payout.bank.bankName}</dt>
            <dd>
              {payout.bank.accountHolder}
              <strong>{payout.bank.accountNumber}</strong>
            </dd>
          </>
        ) : null}
      </dl>
      {payout.instructions ? <p className="sb-v2__footnote">{payout.instructions}</p> : null}
    </article>
  );
}
