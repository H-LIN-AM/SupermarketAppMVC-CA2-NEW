// ========================================
// Voucher Model
// Handles database operations for vouchers
// ========================================
const db = require('../db');

/**
 * Generate a unique voucher code
 */
function generateVoucherCode(prefix = 'HB') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = prefix;
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Create vouchers for a membership
 * @param {number} userId - User ID
 * @param {number} membershipId - Membership ID
 * @param {number} count - Number of vouchers
 * @param {string} type - 'percentage' or 'fixed'
 * @param {number} value - Voucher value
 * @param {number} minOrder - Minimum order amount
 * @param {number} validDays - Voucher validity in days
 */
function createMembershipVouchers(userId, membershipId, count, type, value, minOrder, validDays, callback) {
    const vouchers = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validDays);

    const insertVoucher = (index) => {
        if (index >= count) {
            return callback(null, vouchers);
        }

        const code = generateVoucherCode('MEM');
        const sql = `
            INSERT INTO vouchers (code, user_id, type, value, min_order, source, membership_id, expires_at)
            VALUES (?, ?, ?, ?, ?, 'membership', ?, ?)
        `;
        db.query(sql, [code, userId, type, value, minOrder, membershipId, expiresAt], (err, result) => {
            if (err) {
                // Code might be duplicate, try again with new code
                if (err.code === 'ER_DUP_ENTRY') {
                    return insertVoucher(index);
                }
                return callback(err);
            }
            vouchers.push({ id: result.insertId, code, type, value, minOrder });
            insertVoucher(index + 1);
        });
    };

    insertVoucher(0);
}

/**
 * Get user's available vouchers (not used, not expired)
 */
function getUserVouchers(userId, callback) {
    const sql = `
        SELECT * FROM vouchers
        WHERE user_id = ? AND is_used = 0 AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY expires_at ASC
    `;
    db.query(sql, [userId], callback);
}

/**
 * Get user's all vouchers (including used/expired)
 */
function getUserAllVouchers(userId, callback) {
    const sql = `
        SELECT v.*, o.id as order_id
        FROM vouchers v
        LEFT JOIN orders o ON v.used_order_id = o.id
        WHERE v.user_id = ?
        ORDER BY v.created_at DESC
    `;
    db.query(sql, [userId], callback);
}

/**
 * Get voucher by code (for validation)
 */
function getByCode(code, callback) {
    const sql = 'SELECT * FROM vouchers WHERE code = ?';
    db.query(sql, [code], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0] || null);
    });
}

/**
 * Get voucher by ID
 */
function getById(voucherId, callback) {
    const sql = 'SELECT * FROM vouchers WHERE id = ?';
    db.query(sql, [voucherId], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0] || null);
    });
}

/**
 * Validate and calculate voucher discount
 * @returns {object} { valid: boolean, error: string, discount: number }
 */
function validateVoucher(code, userId, orderTotal, callback) {
    getByCode(code, (err, voucher) => {
        if (err) return callback(err);

        if (!voucher) {
            return callback(null, { valid: false, error: 'Invalid voucher code' });
        }

        // Check if voucher belongs to user (if user-specific)
        if (voucher.user_id !== null && voucher.user_id !== userId) {
            return callback(null, { valid: false, error: 'This voucher is not available for your account' });
        }

        // Check if already used
        if (voucher.is_used) {
            return callback(null, { valid: false, error: 'This voucher has already been used' });
        }

        // Check expiry
        if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
            return callback(null, { valid: false, error: 'This voucher has expired' });
        }

        // Check minimum order
        if (voucher.min_order && orderTotal < voucher.min_order) {
            return callback(null, {
                valid: false,
                error: `Minimum order amount is $${parseFloat(voucher.min_order).toFixed(2)}`
            });
        }

        // Calculate discount
        let discount = 0;
        if (voucher.type === 'percentage') {
            discount = orderTotal * (voucher.value / 100);
            // Apply max discount cap if set
            if (voucher.max_discount && discount > voucher.max_discount) {
                discount = voucher.max_discount;
            }
        } else {
            discount = voucher.value;
        }

        // Discount cannot exceed order total
        if (discount > orderTotal) {
            discount = orderTotal;
        }

        callback(null, {
            valid: true,
            voucher: voucher,
            discount: Math.round(discount * 100) / 100
        });
    });
}

/**
 * Mark voucher as used
 */
function useVoucher(voucherId, orderId, callback) {
    const sql = `
        UPDATE vouchers SET
        is_used = 1, used_at = NOW(), used_order_id = ?
        WHERE id = ?
    `;
    db.query(sql, [orderId, voucherId], callback);
}

/**
 * Unuse voucher (for order cancellation/refund)
 */
function unuseVoucher(voucherId, callback) {
    const sql = `
        UPDATE vouchers SET
        is_used = 0, used_at = NULL, used_order_id = NULL
        WHERE id = ?
    `;
    db.query(sql, [voucherId], callback);
}

// ========================================
// Admin functions
// ========================================

/**
 * Get all vouchers (admin)
 */
function getAllVouchers(callback) {
    const sql = `
        SELECT v.*, u.username, u.email
        FROM vouchers v
        LEFT JOIN users u ON v.user_id = u.id
        ORDER BY v.created_at DESC
    `;
    db.query(sql, [], callback);
}

/**
 * Create a promotional voucher (admin)
 */
function createPromoVoucher(voucher, callback) {
    const code = voucher.code || generateVoucherCode('PROMO');
    const sql = `
        INSERT INTO vouchers (code, user_id, type, value, min_order, max_discount, source, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, 'admin', ?)
    `;
    const values = [
        code,
        voucher.user_id || null,
        voucher.type || 'percentage',
        voucher.value,
        voucher.min_order || 0,
        voucher.max_discount || null,
        voucher.expires_at || null
    ];
    db.query(sql, values, (err, result) => {
        if (err) return callback(err);
        callback(null, { id: result.insertId, code });
    });
}

/**
 * Delete voucher (admin)
 */
function deleteVoucher(voucherId, callback) {
    const sql = 'DELETE FROM vouchers WHERE id = ?';
    db.query(sql, [voucherId], callback);
}

// ========================================
// Export
// ========================================
module.exports = {
    generateVoucherCode,
    createMembershipVouchers,
    getUserVouchers,
    getUserAllVouchers,
    getByCode,
    getById,
    validateVoucher,
    useVoucher,
    unuseVoucher,
    getAllVouchers,
    createPromoVoucher,
    deleteVoucher
};
