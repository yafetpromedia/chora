"use client";

type AuthSubmitButtonProps = {
  loading: boolean;
  loadingLabel: string;
  label: string;
};

export function AuthSubmitButton({ loading, loadingLabel, label }: AuthSubmitButtonProps) {
  return (
    <button type="submit" className="auth-submit" disabled={loading}>
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
