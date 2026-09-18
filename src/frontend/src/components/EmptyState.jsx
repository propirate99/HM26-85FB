export function EmptyState({ title, body, action }) {
  return (
    <div className="empty card">
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
