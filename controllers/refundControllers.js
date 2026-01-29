// ========================================
// Refund Controller
// Handles refund request business logic
// [NEW FILE] Created for refund feature
// ========================================
const Refund = require('../models/refund');
const Order = require('../models/order');
const Voucher = require('../models/voucher');

/**
 * Show refund request form
 */
function showRefundForm(req, res) {
    const user = req.session.user;
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/orders');
    }

    Order.getById(orderId, (err, order) => {
        if (err || !order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }

        // Check permission
        if (order.user_id !== user.id) {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }

        // Check if can refund
        Refund.canRefund(orderId, (canErr, result) => {
            if (canErr || !result.canRefund) {
                req.flash('error', result ? result.reason : 'Cannot request refund');
                return res.redirect(`/order/${orderId}`);
            }

            res.render('requestRefund', {
                user,
                order,
                messages: req.flash()
            });
        });
    });
}

/**
 * Submit refund request
 */
function submitRefund(req, res) {
    const user = req.session.user;
    const orderId = parseInt(req.params.orderId, 10);
    const { reason, description } = req.body;

    if (isNaN(orderId) || !reason) {
        req.flash('error', 'Please select a reason');
        return res.redirect(`/order/${orderId}/refund`);
    }

    Order.getById(orderId, (err, order) => {
        if (err || !order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }

        if (order.user_id !== user.id) {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }

        Refund.canRefund(orderId, (canErr, result) => {
            if (canErr || !result.canRefund) {
                req.flash('error', result ? result.reason : 'Cannot request refund');
                return res.redirect(`/order/${orderId}`);
            }

            // Calculate refund amount (order total + delivery - discount)
            const subtotal = parseFloat(order.total) || 0;
            const deliveryFee = subtotal >= 60 ? 0 : 5;
            const discount = parseFloat(order.discount_amount) || 0;
            const refundAmount = subtotal + deliveryFee - discount;

            Refund.createRefund(orderId, user.id, refundAmount, reason, description, (createErr) => {
                if (createErr) {
                    console.error('Error creating refund:', createErr);
                    req.flash('error', 'Failed to submit refund request');
                    return res.redirect(`/order/${orderId}/refund`);
                }

                req.flash('success', 'Refund request submitted successfully');
                res.redirect(`/order/${orderId}`);
            });
        });
    });
}

/**
 * View user's refund requests
 */
function listUserRefunds(req, res) {
    const user = req.session.user;

    Refund.getUserRefunds(user.id, (err, refunds) => {
        if (err) {
            console.error('Error fetching refunds:', err);
            refunds = [];
        }

        res.render('myRefunds', {
            user,
            refunds,
            messages: req.flash()
        });
    });
}

/**
 * Cancel refund request
 */
function cancelRefund(req, res) {
    const user = req.session.user;
    const refundId = parseInt(req.params.id, 10);

    if (isNaN(refundId)) {
        req.flash('error', 'Invalid refund ID');
        return res.redirect('/refunds');
    }

    Refund.cancelRefund(refundId, user.id, (err) => {
        if (err) {
            console.error('Error cancelling refund:', err);
            req.flash('error', err.message || 'Failed to cancel refund');
        } else {
            req.flash('success', 'Refund request cancelled');
        }
        res.redirect('/refunds');
    });
}

// ========================================
// Admin Functions
// ========================================

/**
 * Admin: List all refunds
 */
function adminListRefunds(req, res) {
    const user = req.session.user;

    Refund.getAll((err, refunds) => {
        if (err) {
            console.error('Error fetching refunds:', err);
            refunds = [];
        }

        res.render('adminRefunds', {
            user,
            refunds,
            messages: req.flash()
        });
    });
}

/**
 * Admin: View refund details
 */
function adminViewRefund(req, res) {
    const user = req.session.user;
    const refundId = parseInt(req.params.id, 10);

    if (isNaN(refundId)) {
        req.flash('error', 'Invalid refund ID');
        return res.redirect('/admin/refunds');
    }

    Refund.getById(refundId, (err, refund) => {
        if (err || !refund) {
            req.flash('error', 'Refund not found');
            return res.redirect('/admin/refunds');
        }

        Order.getById(refund.order_id, (orderErr, order) => {
            res.render('adminRefundDetail', {
                user,
                refund,
                order: order || {},
                messages: req.flash()
            });
        });
    });
}

/**
 * Admin: Approve refund
 */
function adminApproveRefund(req, res) {
    const user = req.session.user;
    const refundId = parseInt(req.params.id, 10);
    const { admin_note } = req.body;

    if (isNaN(refundId)) {
        req.flash('error', 'Invalid refund ID');
        return res.redirect('/admin/refunds');
    }

    Refund.getById(refundId, (err, refund) => {
        if (err || !refund) {
            req.flash('error', 'Refund not found');
            return res.redirect('/admin/refunds');
        }

        if (refund.status !== 'Pending') {
            req.flash('error', 'Refund already processed');
            return res.redirect(`/admin/refund/${refundId}`);
        }

        Refund.updateStatus(refundId, 'Approved', user.id, admin_note, (updateErr) => {
            if (updateErr) {
                console.error('Error approving refund:', updateErr);
                req.flash('error', 'Failed to approve refund');
                return res.redirect(`/admin/refund/${refundId}`);
            }

            // Update order status
            Order.updateStatus(refund.order_id, 'Refunded', () => {
                // Restore voucher if used
                if (refund.voucher_code) {
                    Voucher.getByCode(refund.voucher_code, (vErr, voucher) => {
                        if (voucher) {
                            Voucher.unuseVoucher(voucher.id, () => {});
                        }
                    });
                }

                req.flash('success', 'Refund approved. Stock has been restored.');
                res.redirect('/admin/refunds');
            });
        });
    });
}

/**
 * Admin: Reject refund
 */
function adminRejectRefund(req, res) {
    const user = req.session.user;
    const refundId = parseInt(req.params.id, 10);
    const { admin_note } = req.body;

    if (isNaN(refundId)) {
        req.flash('error', 'Invalid refund ID');
        return res.redirect('/admin/refunds');
    }

    Refund.updateStatus(refundId, 'Rejected', user.id, admin_note || 'Refund request rejected', (err) => {
        if (err) {
            console.error('Error rejecting refund:', err);
            req.flash('error', 'Failed to reject refund');
        } else {
            req.flash('success', 'Refund rejected');
        }
        res.redirect('/admin/refunds');
    });
}

/**
 * Admin: Complete refund (after payment processed)
 */
function adminCompleteRefund(req, res) {
    const user = req.session.user;
    const refundId = parseInt(req.params.id, 10);
    const { refund_method, refund_ref } = req.body;

    if (isNaN(refundId)) {
        req.flash('error', 'Invalid refund ID');
        return res.redirect('/admin/refunds');
    }

    // First update refund method/ref
    const sql = `UPDATE refunds SET refund_method = ?, refund_ref = ? WHERE id = ?`;
    const db = require('../db');
    db.query(sql, [refund_method || 'Manual', refund_ref || null, refundId], (sqlErr) => {
        if (sqlErr) console.error('Error updating refund method:', sqlErr);

        Refund.updateStatus(refundId, 'Completed', user.id, 'Refund completed', (err) => {
            if (err) {
                console.error('Error completing refund:', err);
                req.flash('error', 'Failed to complete refund');
            } else {
                req.flash('success', 'Refund marked as completed');
            }
            res.redirect('/admin/refunds');
        });
    });
}

// ========================================
// Export
// ========================================
module.exports = {
    showRefundForm,
    submitRefund,
    listUserRefunds,
    cancelRefund,
    // Admin
    adminListRefunds,
    adminViewRefund,
    adminApproveRefund,
    adminRejectRefund,
    adminCompleteRefund
};
