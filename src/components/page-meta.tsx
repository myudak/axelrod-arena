/** Per-route document metadata using React 19's native <title>/<meta> hoisting. */
export function PageMeta({ title, description }: { title?: string; description: string }) {
  return (
    <>
      <title>{title ? `${title} · Axelrod Arena` : "Axelrod Arena"}</title>
      <meta name="description" content={description} />
    </>
  );
}
