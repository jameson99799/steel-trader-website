export function visitorListSql({ withUnread = true, orderByTimestamp = true } = {}) {
  const unreadCount = withUnread
    ? "(SELECT COUNT(*) FROM live_chat_messages WHERE visitor_id = m.visitor_id AND sender_type = 'visitor' AND is_read = 0)"
    : '0'
  const orderBy = orderByTimestamp ? 'm.timestamp DESC' : 'm.id DESC'

  return `
    SELECT m.*,
      visitor_meta.ip AS ip,
      visitor_meta.country AS country,
      visitor_meta.country_code AS country_code,
      visitor_meta.geo_source AS geo_source,
      ${unreadCount} AS unread_count
    FROM live_chat_messages m
    INNER JOIN (
      SELECT visitor_id, MAX(id) AS max_id FROM live_chat_messages GROUP BY visitor_id
    ) grouped ON m.id = grouped.max_id
    LEFT JOIN live_chat_messages visitor_meta ON visitor_meta.id = (
      SELECT id FROM live_chat_messages
      WHERE visitor_id = m.visitor_id AND sender_type = 'visitor' AND ip IS NOT NULL AND ip != ''
      ORDER BY id DESC LIMIT 1
    )
    ORDER BY ${orderBy}
  `
}
