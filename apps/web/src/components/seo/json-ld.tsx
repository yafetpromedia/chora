type Props = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

/** Safe JSON-LD script for search engines. */
export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
