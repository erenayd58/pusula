/** Alan altı doğrulama mesajı (react-hook-form). Hata rengi + metin; ikon form geneli hatada. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-micro-lg text-error">
      {message}
    </p>
  );
}
