// ========================================
// Membership Model
// Handles database operations for membership plans and user memberships
// ========================================
const db = require('../db');

// ========================================
// Membership Plans
// ========================================

/**
 * Get all active membership plans
 */
function getAllPlans(callback) {
    const sql = 'SELECT * FROM membership_plans WHERE is_active = 1 ORDER BY price ASC';
    db.query(sql, [], callback);
}

/**
 * Get all plans (including inactive) for admin
 */
function getAllPlansAdmin(callback) {
    const sql = 'SELECT * FROM membership_plans ORDER BY price ASC';
    db.query(sql, [], callback);
}

/**
 * Get plan by ID
 */
function getPlanById(planId, callback) {
    const sql = 'SELECT * FROM membership_plans WHERE id = ?';
    db.query(sql, [planId], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0] || null);
    });
}

/**
 * Create a new membership plan (admin)
 */
function createPlan(plan, callback) {
    const sql = `
        INSERT INTO membership_plans
        (name, description, price, duration_days, voucher_count, voucher_type, voucher_value, voucher_min_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        plan.name,
        plan.description || '',
        plan.price,
        plan.duration_days || 30,
        plan.voucher_count || 1,
        plan.voucher_type || 'percentage',
        plan.voucher_value || 10,
        plan.voucher_min_order || 0,
        plan.is_active !== undefined ? plan.is_active : 1
    ];
    db.query(sql, values, callback);
}

/**
 * Update membership plan (admin)
 */
function updatePlan(planId, plan, callback) {
    const sql = `
        UPDATE membership_plans SET
        name = ?, description = ?, price = ?, duration_days = ?,
        voucher_count = ?, voucher_type = ?, voucher_value = ?, voucher_min_order = ?, is_active = ?
        WHERE id = ?
    `;
    const values = [
        plan.name,
        plan.description || '',
        plan.price,
        plan.duration_days || 30,
        plan.voucher_count || 1,
        plan.voucher_type || 'percentage',
        plan.voucher_value || 10,
        plan.voucher_min_order || 0,
        plan.is_active !== undefined ? plan.is_active : 1,
        planId
    ];
    db.query(sql, values, callback);
}

/**
 * Delete membership plan (admin)
 */
function deletePlan(planId, callback) {
    const sql = 'DELETE FROM membership_plans WHERE id = ?';
    db.query(sql, [planId], callback);
}

// ========================================
// User Memberships
// ========================================

/**
 * Get user's active membership
 */
function getUserActiveMembership(userId, callback) {
    const sql = `
        SELECT um.*, mp.name as plan_name, mp.description as plan_description
        FROM user_memberships um
        JOIN membership_plans mp ON um.plan_id = mp.id
        WHERE um.user_id = ? AND um.status = 'Active' AND um.expires_at > NOW()
        ORDER BY um.expires_at DESC
        LIMIT 1
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0] || null);
    });
}

/**
 * Get all memberships for a user
 */
function getUserMemberships(userId, callback) {
    const sql = `
        SELECT um.*, mp.name as plan_name, mp.price as plan_price
        FROM user_memberships um
        JOIN membership_plans mp ON um.plan_id = mp.id
        WHERE um.user_id = ?
        ORDER BY um.created_at DESC
    `;
    db.query(sql, [userId], callback);
}

/**
 * Get all memberships (admin)
 */
function getAllMemberships(callback) {
    const sql = `
        SELECT um.*, mp.name as plan_name, mp.price as plan_price,
               u.username, u.email
        FROM user_memberships um
        JOIN membership_plans mp ON um.plan_id = mp.id
        JOIN users u ON um.user_id = u.id
        ORDER BY um.created_at DESC
    `;
    db.query(sql, [], callback);
}

/**
 * Create user membership (pending payment)
 */
function createMembership(userId, planId, callback) {
    const sql = `
        INSERT INTO user_memberships (user_id, plan_id, status, created_at)
        VALUES (?, ?, 'Pending', NOW())
    `;
    db.query(sql, [userId, planId], callback);
}

/**
 * Get membership by ID
 */
function getMembershipById(membershipId, callback) {
    const sql = `
        SELECT um.*, mp.name as plan_name, mp.price as plan_price,
               mp.duration_days, mp.voucher_count, mp.voucher_type,
               mp.voucher_value, mp.voucher_min_order,
               u.username, u.email
        FROM user_memberships um
        JOIN membership_plans mp ON um.plan_id = mp.id
        JOIN users u ON um.user_id = u.id
        WHERE um.id = ?
    `;
    db.query(sql, [membershipId], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0] || null);
    });
}

/**
 * Start membership payment
 */
function startPayment(membershipId, paymentMethod, paymentRef, callback) {
    const sql = `
        UPDATE user_memberships SET
        payment_method = ?, payment_ref = ?
        WHERE id = ?
    `;
    db.query(sql, [paymentMethod, paymentRef, membershipId], callback);
}

/**
 * Activate membership after payment
 */
function activateMembership(membershipId, durationDays, callback) {
    const sql = `
        UPDATE user_memberships SET
        status = 'Active',
        started_at = NOW(),
        expires_at = DATE_ADD(NOW(), INTERVAL ? DAY)
        WHERE id = ?
    `;
    db.query(sql, [durationDays, membershipId], callback);
}

/**
 * Cancel membership
 */
function cancelMembership(membershipId, callback) {
    const sql = `UPDATE user_memberships SET status = 'Cancelled' WHERE id = ?`;
    db.query(sql, [membershipId], callback);
}

/**
 * Check and expire old memberships (can be called periodically)
 */
function expireOldMemberships(callback) {
    const sql = `
        UPDATE user_memberships SET status = 'Expired'
        WHERE status = 'Active' AND expires_at < NOW()
    `;
    db.query(sql, [], callback);
}

// ========================================
// Export
// ========================================
module.exports = {
    // Plans
    getAllPlans,
    getAllPlansAdmin,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan,
    // User Memberships
    getUserActiveMembership,
    getUserMemberships,
    getAllMemberships,
    createMembership,
    getMembershipById,
    startPayment,
    activateMembership,
    cancelMembership,
    expireOldMemberships
};
