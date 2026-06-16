interface PlaceholderListProps {
  items: string[];
}

export function PlaceholderList({ items }: PlaceholderListProps) {
  return (
    <ul className="space-y-2 text-sm leading-6 text-slate-700">
      {items.map((item) => (
        <li key={item} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          {item}
        </li>
      ))}
    </ul>
  );
}
