// ========================================
// Membership Controller
// Handles membership subscription and payment
// ========================================
const Membership = require('../models/membership');
const Voucher = require('../models/voucher');
const alipaySandbox = require('../utils/alipaySandbox');
const paypalSandbox = require('../utils/paypalSandbox');

/**
 * Show membership plans page
 */
function showPlans(req, res) {
    const user = req.session.user;

    Membership.getAllPlans((err, plans) => {
        if (err) {
            console.error('Error fetching plans:', err);
            return res.render('membership', { user, plans: [], activeMembership: null, messages: req.flash() });
        }

        // Get user's active membership
        Membership.getUserActiveMembership(user.id, (err, activeMembership) => {
            if (err) {
                console.error('Error fetching user membership:', err);
            }
            res.render('membership', { user, plans, activeMembership: activeMembership || null, messages: req.flash() });
        });
    });
}

/**
 * Show my membership page
 */
function showMyMembership(req, res) {
    const user = req.session.user;

    Membership.getUserActiveMembership(user.id, (err, activeMembership) => {
        if (err) {
            console.error('Error fetching active membership:', err);
        }

        Membership.getUserMemberships(user.id, (err, memberships) => {
            if (err) {
                console.error('Error fetching memberships:', err);
                return res.render('myMembership', { user, activeMembership: null, memberships: [], messages: req.flash() });
            }

            Voucher.getUserAllVouchers(user.id, (err, vouchers) => {
                if (err) {
                    console.error('Error fetching vouchers:', err);
                    vouchers = [];
                }

                res.render('myMembership', {
                    user,
                    activeMembership: activeMembership || null,
                    memberships,
                    vouchers,
                    messages: req.flash()
                });
            });
        });
    });
}

/**
 * Subscribe to a membership plan
 */
function subscribe(req, res) {
    const user = req.session.user;
    const planId = parseInt(req.params.planId, 10);

    if (isNaN(planId)) {
        req.flash('error', 'Invalid plan');
        return res.redirect('/membership');
    }

    Membership.getPlanById(planId, (err, plan) => {
        if (err || !plan) {
            req.flash('error', 'Plan not found');
            return res.redirect('/membership');
        }

        if (!plan.is_active) {
            req.flash('error', 'This plan is no longer available');
            return res.redirect('/membership');
        }

        // Create pending membership
        Membership.createMembership(user.id, planId, (err, result) => {
            if (err) {
                console.error('Error creating membership:', err);
                req.flash('error', 'Failed to create subscription');
                return res.redirect('/membership');
            }

            const membershipId = result.insertId;
            res.redirect(`/membership/pay/${membershipId}`);
        });
    });
}

/**
 * Show membership payment page
 */
function showPayPage(req, res) {
    const user = req.session.user;
    const membershipId = parseInt(req.params.id, 10);

    if (isNaN(membershipId)) {
        req.flash('error', 'Invalid membership');
        return res.redirect('/membership');
    }

    Membership.getMembershipById(membershipId, (err, membership) => {
        if (err || !membership) {
            req.flash('error', 'Membership not found');
            return res.redirect('/membership');
        }

        if (membership.user_id !== user.id) {
            req.flash('error', 'Access denied');
            return res.redirect('/membership');
        }

        if (membership.status === 'Active') {
            req.flash('success', 'Membership already active');
            return res.redirect('/membership/my');
        }

        res.render('membershipPay', { user, membership, messages: req.flash() });
    });
}

/**
 * Start membership payment (AJAX)
 */
function startPayment(req, res) {
    const user = req.session.user;
    const membershipId = parseInt(req.params.id, 10);
    const paymentMethod = (req.body.paymentMethod || '').toString().trim().toLowerCase();

    if (isNaN(membershipId)) {
        return res.json({ ok: false, error: 'Invalid membership ID' });
    }

    if (paymentMethod !== 'alipay' && paymentMethod !== 'paypal') {
        return res.json({ ok: false, error: 'Invalid payment method' });
    }

    Membership.getMembershipById(membershipId, async (err, membership) => {
        if (err || !membership) {
            return res.json({ ok: false, error: 'Membership not found' });
        }

        if (membership.user_id !== user.id) {
            return res.json({ ok: false, error: 'Access denied' });
        }

        if (membership.status === 'Active') {
            return res.json({ ok: true, alreadyActive: true });
        }

        const outTradeNo = `MEM_${membershipId}_${Date.now()}`;
        const amount = parseFloat(membership.plan_price);

        // Create a fake order object for payment utils
        const orderForPay = {
            id: membershipId,
            total: amount,
            user_id: user.id
        };

        try {
            if (paymentMethod === 'alipay') {
                const created = alipaySandbox.buildOrderPayUrl(req, orderForPay, outTradeNo);
                Membership.startPayment(membershipId, 'alipay', created.outTradeNo, (e) => {
                    if (e) return res.json({ ok: false, error: e.message });
                    return res.json({ ok: true, outTradeNo: created.outTradeNo, url: created.url });
                });
                return;
            }

            if (paymentMethod === 'paypal') {
                const created = await paypalSandbox.buildOrderPayUrl(req, orderForPay, outTradeNo);
                Membership.startPayment(membershipId, 'paypal', created.outTradeNo, (e) => {
                    if (e) return res.json({ ok: false, error: e.message });
                    return res.json({ ok: true, outTradeNo: created.outTradeNo, url: created.url });
                });
                return;
            }
        } catch (e) {
            return res.json({ ok: false, error: e.message || 'Payment failed' });
        }
    });
}

/**
 * Check membership payment status (AJAX)
 */
function checkPaymentStatus(req, res) {
    const user = req.session.user;
    const membershipId = parseInt(req.params.id, 10);
    const outTradeNo = (req.query.out_trade_no || '').toString().trim();

    if (isNaN(membershipId)) {
        return res.json({ ok: false, error: 'Invalid membership ID' });
    }

    Membership.getMembershipById(membershipId, async (err, membership) => {
        if (err || !membership) {
            return res.json({ ok: false, error: 'Membership not found' });
        }

        if (membership.user_id !== user.id) {
            return res.json({ ok: false, error: 'Access denied' });
        }

        if (membership.status === 'Active') {
            return res.json({ ok: true, paid: true });
        }

        const method = (membership.payment_method || '').toLowerCase();

        try {
            if (method === 'alipay') {
                const result = await alipaySandbox.queryOrderPaid(req, membershipId, outTradeNo);
                if (!result.ok) return res.json({ ok: false, error: result.error });
                if (!result.paid) return res.json({ ok: true, paid: false });

                // Activate membership and create vouchers
                return activateMembershipAndCreateVouchers(membership, res);
            }

            if (method === 'paypal') {
                const result = await paypalSandbox.queryOrderPaid(req, membershipId, membership.payment_ref);
                if (!result.ok) return res.json({ ok: false, error: result.error });
                if (!result.paid) return res.json({ ok: true, paid: false });

                return activateMembershipAndCreateVouchers(membership, res);
            }

            return res.json({ ok: false, error: 'Payment not started' });
        } catch (e) {
            return res.json({ ok: false, error: e.message });
        }
    });
}

/**
 * Helper: Activate membership and create vouchers
 */
function activateMembershipAndCreateVouchers(membership, res) {
    Membership.activateMembership(membership.id, membership.duration_days, (err) => {
        if (err) {
            console.error('Error activating membership:', err);
            return res.json({ ok: false, error: 'Failed to activate membership' });
        }

        // Create vouchers for the user
        Voucher.createMembershipVouchers(
            membership.user_id,
            membership.id,
            membership.voucher_count,
            membership.voucher_type,
            membership.voucher_value,
            membership.voucher_min_order,
            membership.duration_days, // Vouchers valid for membership duration
            (err, vouchers) => {
                if (err) {
                    console.error('Error creating vouchers:', err);
                    // Membership is still active, just vouchers failed
                }
                return res.json({ ok: true, paid: true, vouchersCreated: vouchers ? vouchers.length : 0 });
            }
        );
    });
}

/**
 * Finish membership payment (redirect landing)
 */
function finishPayment(req, res) {
    const user = req.session.user;
    const membershipId = parseInt(req.params.id, 10);

    if (isNaN(membershipId)) {
        req.flash('error', 'Invalid membership');
        return res.redirect('/membership');
    }

    Membership.getMembershipById(membershipId, (err, membership) => {
        if (err || !membership) {
            req.flash('error', 'Membership not found');
            return res.redirect('/membership');
        }

        if (membership.user_id !== user.id) {
            req.flash('error', 'Access denied');
            return res.redirect('/membership');
        }

        if (membership.status === 'Active') {
            req.flash('success', 'Membership activated! Your vouchers are ready to use.');
            return res.redirect('/membership/my');
        }

        req.flash('error', 'Payment not completed');
        return res.redirect(`/membership/pay/${membershipId}`);
    });
}

// ========================================
// Admin Functions
// ========================================

/**
 * Admin: Show all membership plans
 */
function adminListPlans(req, res) {
    const user = req.session.user;

    Membership.getAllPlansAdmin((err, plans) => {
        if (err) {
            console.error('Error fetching plans:', err);
            plans = [];
        }

        res.render('adminMembershipPlans', { user, plans, messages: req.flash() });
    });
}

/**
 * Admin: Show create plan form
 */
function adminShowCreatePlan(req, res) {
    const user = req.session.user;
    res.render('adminMembershipPlanForm', { user, plan: null, messages: req.flash() });
}

/**
 * Admin: Create plan
 */
function adminCreatePlan(req, res) {
    const plan = {
        name: req.body.name,
        description: req.body.description,
        price: parseFloat(req.body.price),
        duration_days: parseInt(req.body.duration_days, 10) || 30,
        voucher_count: parseInt(req.body.voucher_count, 10) || 1,
        voucher_type: req.body.voucher_type || 'percentage',
        voucher_value: parseFloat(req.body.voucher_value) || 10,
        voucher_min_order: parseFloat(req.body.voucher_min_order) || 0,
        is_active: req.body.is_active === 'on' ? 1 : 0
    };

    if (!plan.name || isNaN(plan.price)) {
        req.flash('error', 'Name and price are required');
        return res.redirect('/admin/membership/plans/create');
    }

    Membership.createPlan(plan, (err) => {
        if (err) {
            console.error('Error creating plan:', err);
            req.flash('error', 'Failed to create plan');
            return res.redirect('/admin/membership/plans/create');
        }

        req.flash('success', 'Plan created successfully');
        res.redirect('/admin/membership/plans');
    });
}

/**
 * Admin: Show edit plan form
 */
function adminShowEditPlan(req, res) {
    const user = req.session.user;
    const planId = parseInt(req.params.id, 10);

    Membership.getPlanById(planId, (err, plan) => {
        if (err || !plan) {
            req.flash('error', 'Plan not found');
            return res.redirect('/admin/membership/plans');
        }

        res.render('adminMembershipPlanForm', { user, plan, messages: req.flash() });
    });
}

/**
 * Admin: Update plan
 */
function adminUpdatePlan(req, res) {
    const planId = parseInt(req.params.id, 10);
    const plan = {
        name: req.body.name,
        description: req.body.description,
        price: parseFloat(req.body.price),
        duration_days: parseInt(req.body.duration_days, 10) || 30,
        voucher_count: parseInt(req.body.voucher_count, 10) || 1,
        voucher_type: req.body.voucher_type || 'percentage',
        voucher_value: parseFloat(req.body.voucher_value) || 10,
        voucher_min_order: parseFloat(req.body.voucher_min_order) || 0,
        is_active: req.body.is_active === 'on' ? 1 : 0
    };

    Membership.updatePlan(planId, plan, (err) => {
        if (err) {
            console.error('Error updating plan:', err);
            req.flash('error', 'Failed to update plan');
            return res.redirect(`/admin/membership/plans/edit/${planId}`);
        }

        req.flash('success', 'Plan updated successfully');
        res.redirect('/admin/membership/plans');
    });
}

/**
 * Admin: Delete plan
 */
function adminDeletePlan(req, res) {
    const planId = parseInt(req.params.id, 10);

    Membership.deletePlan(planId, (err) => {
        if (err) {
            console.error('Error deleting plan:', err);
            req.flash('error', 'Failed to delete plan');
        } else {
            req.flash('success', 'Plan deleted successfully');
        }
        res.redirect('/admin/membership/plans');
    });
}

/**
 * Admin: List all memberships
 */
function adminListMemberships(req, res) {
    const user = req.session.user;

    Membership.getAllMemberships((err, memberships) => {
        if (err) {
            console.error('Error fetching memberships:', err);
            memberships = [];
        }

        res.render('adminMemberships', { user, memberships, messages: req.flash() });
    });
}

// ========================================
// Export
// ========================================
module.exports = {
    showPlans,
    showMyMembership,
    subscribe,
    showPayPage,
    startPayment,
    checkPaymentStatus,
    finishPayment,
    // Admin
    adminListPlans,
    adminShowCreatePlan,
    adminCreatePlan,
    adminShowEditPlan,
    adminUpdatePlan,
    adminDeletePlan,
    adminListMemberships
};
