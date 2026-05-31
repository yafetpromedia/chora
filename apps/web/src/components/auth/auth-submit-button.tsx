"use client";

type AuthSubmitButtonProps = {
  loading: boolean;
  loadingLabel: string;
  label: string;
  variant?: "default" | "page";
};

export function AuthSubmitButton({
  loading,
  loadingLabel,
  label,
  variant = "default",
}: AuthSubmitButtonProps) {
  const className = variant === "page" ? "auth-page-submit" : "auth-submit";
  return (
    <button type="submit" className={className} disabled={loading}>
      {loading ? (
        <>
          <span className="auth-spinner" aria-hidden />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
