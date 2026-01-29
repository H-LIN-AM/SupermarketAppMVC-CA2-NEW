// ========================================
// Refund Model
// Handles database operations for refund requests
// [NEW FILE] Created for refund feature
// ========================================
const db = require('../db');

/**
 * Create refund request
 */
function createRefund(orderId, userId, amount, reason, description, callback) {
    const sql = `
        INSERT INTO refunds (order_id, user_id, amount, reason, description, status)
        VALUES (?, ?, ?, ?, ?, 'Pending')
    `;
    db.query(sql, [orderId, userId, amount, reason, description || null], (err, result) => {
        if (err) return callback(err);

        // Update order refund status
        updateOrderRefundStatus(orderId, 'Pending', () => {
            callback(null, { id: result.insertId });
        });
    });
}

/**
 * Get refund by ID
 */
function getById(refundId, callback) {
    const sql = `
        SELECT r.*, o.total as order_total, o.status as order_status,
               o.voucher_code, o.discount_amount,
               u.username, u.email
        FROM refunds r
        JOIN orders o ON r.order_id = o.id
        JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
    `;
    db.query(sql, [refundId], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0] || null);
    });
}

/**
 * Get refund by order ID
 */
function getByOrderId(orderId, callback) {
    const sql = `
        SELECT r.*, u.username
        FROM refunds r
        JOIN users u ON r.user_id = u.id
        WHERE r.order_id = ?
        ORDER BY r.requested_at DESC
        LIMIT 1
    `;
    db.query(sql, [orderId], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0] || null);
    });
}

/**
 * Get all refunds for a user
 */
function getUserRefunds(userId, callback) {
    const sql = `
        SELECT r.*, o.id as order_id, o.total as order_total
        FROM refunds r
        JOIN orders o ON r.order_id = o.id
        WHERE r.user_id = ?
        ORDER BY r.requested_at DESC
    `;
    db.query(sql, [userId], callback);
}

/**
 * Get all refunds (admin)
 */
function getAll(callback) {
    const sql = `
        SELECT r.*, o.total as order_total, o.status as order_status,
               u.username, u.email
        FROM refunds r
        JOIN orders o ON r.order_id = o.id
        JOIN users u ON r.user_id = u.id
        ORDER BY r.requested_at DESC
    `;
    db.query(sql, [], callback);
}

/**
 * Get pending refunds count (admin)
 */
function getPendingCount(callback) {
    const sql = "SELECT COUNT(*) as count FROM refunds WHERE status = 'Pending'";
    db.query(sql, [], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0].count);
    });
}

/**
 * Update refund status (admin)
 */
function updateStatus(refundId, status, adminId, adminNote, callback) {
    let sql = `
        UPDATE refunds SET
        status = ?,
        admin_note = ?,
        processed_by = ?,
        processed_at = NOW()
    `;

    if (status === 'Completed') {
        sql += ', completed_at = NOW()';
    }

    sql += ' WHERE id = ?';

    db.query(sql, [status, adminNote || null, adminId, refundId], (err, result) => {
        if (err) return callback(err);

        // Get the refund to update order status
        getById(refundId, (getErr, refund) => {
            if (getErr || !refund) return callback(err, result);

            // Update order refund status
            updateOrderRefundStatus(refund.order_id, status, () => {
                // If approved/completed, restore product stock
                if (status === 'Approved' || status === 'Completed') {
                    restoreProductStock(refund.order_id, () => {
                        callback(null, result);
                    });
                } else {
                    callback(null, result);
                }
            });
        });
    });
}

/**
 * Update order's refund_status field
 */
function updateOrderRefundStatus(orderId, status, callback) {
    const sql = 'UPDATE orders SET refund_status = ? WHERE id = ?';
    db.query(sql, [status, orderId], callback);
}

/**
 * Restore product stock when refund is approved
 */
function restoreProductStock(orderId, callback) {
    // Get order items
    const sql = 'SELECT product_id, quantity FROM order_items WHERE order_id = ?';
    db.query(sql, [orderId], (err, items) => {
        if (err || !items || items.length === 0) return callback(err);

        let completed = 0;
        items.forEach(item => {
            const updateSql = 'UPDATE products SET quantity = quantity + ? WHERE id = ?';
            db.query(updateSql, [item.quantity, item.product_id], () => {
                completed++;
                if (completed === items.length) callback(null);
            });
        });
    });
}

/**
 * Cancel refund request (by user)
 */
function cancelRefund(refundId, userId, callback) {
    const sql = `
        UPDATE refunds SET status = 'Cancelled'
        WHERE id = ? AND user_id = ? AND status = 'Pending'
    `;
    db.query(sql, [refundId, userId], (err, result) => {
        if (err) return callback(err);

        if (result.affectedRows === 0) {
            return callback(new Error('Cannot cancel this refund'));
        }

        // Update order refund status
        getById(refundId, (getErr, refund) => {
            if (refund) {
                updateOrderRefundStatus(refund.order_id, null, () => {
                    callback(null, result);
                });
            } else {
                callback(null, result);
            }
        });
    });
}

/**
 * Check if order can be refunded
 */
function canRefund(orderId, callback) {
    // Check if order exists and is paid
    const orderSql = "SELECT * FROM orders WHERE id = ? AND status = 'Paid'";
    db.query(orderSql, [orderId], (err, orders) => {
        if (err) return callback(err);
        if (!orders || orders.length === 0) {
            return callback(null, { canRefund: false, reason: 'Order not found or not paid' });
        }

        // Check if there's already a pending/approved refund
        const refundSql = "SELECT * FROM refunds WHERE order_id = ? AND status IN ('Pending', 'Approved')";
        db.query(refundSql, [orderId], (refundErr, refunds) => {
            if (refundErr) return callback(refundErr);
            if (refunds && refunds.length > 0) {
                return callback(null, { canRefund: false, reason: 'Refund already requested' });
            }

            callback(null, { canRefund: true, order: orders[0] });
        });
    });
}

// ========================================
// Export
// ========================================
module.exports = {
    createRefund,
    getById,
    getByOrderId,
    getUserRefunds,
    getAll,
    getPendingCount,
    updateStatus,
    cancelRefund,
    canRefund,
    restoreProductStock
};
