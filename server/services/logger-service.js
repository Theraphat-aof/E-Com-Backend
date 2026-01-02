const pool = require('../config/db');

exports.logAction = async (
  userId,
  action,
  tableName,
  recordId,
  oldValues = null,
  newValues = null,
  ipAddress = null
) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        userId,
        action,
        tableName,
        recordId,
        JSON.stringify(oldValues),
        JSON.stringify(newValues),
        ipAddress
      ]
    );
  } catch (err) {
    console.error('Logging error:', err);
  }
};

// ✅ ดึง Audit Log สำหรับ Admin
exports.getAuditLog = async (filters = {}) => {
  const { userId, action, limit = 100, offset = 0 } = filters;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const values = [];

  if (userId) {
    query += ` AND user_id = $${values.length + 1}`;
    values.push(userId);
  }

  if (action) {
    query += ` AND action = $${values.length + 1}`;
    values.push(action);
  }

  query += ` ORDER BY timestamp DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  return result.rows;
};
