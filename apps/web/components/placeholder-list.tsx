interface PlaceholderListProps {
  items: string[];
}

export function PlaceholderList({ items }: PlaceholderListProps) {
  return (
    <ul className="space-y-2 text-sm leading-6">
      {items.map((item) => (
        <li key={item} className="wc-list-item rounded-2xl px-4 py-3">
          {item}
        </li>
      ))}
    </ul>
  );
}
