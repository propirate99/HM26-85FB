import { useEffect, useState } from "react";
import { issueApi } from "../../api/issueApi.js";
import { formatDate } from "../../utils/formatDate.js";

export function NotificationPanel() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    issueApi
      .notifications()
      .then((d) => setItems(d.notifications || []))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return <p className="muted">No operational alerts.</p>;

  return (
    <ul className="timeline">
      {items.map((n) => (
        <li key={n._id}>
          <strong>{n.title}</strong>
          <p>{n.body}</p>
          <span className="muted">{formatDate(n.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
