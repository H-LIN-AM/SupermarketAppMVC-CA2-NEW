// ========================================
// Voucher Controller
// Handles voucher validation and admin management
// ========================================
const Voucher = require('../models/voucher');

/**
 * Show user's vouchers page
 */
function showMyVouchers(req, res) {
    const user = req.session.user;

    Voucher.getUserAllVouchers(user.id, (err, vouchers) => {
        if (err) {
            console.error('Error fetching vouchers:', err);
            vouchers = [];
        }

        // Separate active and used/expired vouchers
        const now = new Date();
        const activeVouchers = vouchers.filter(v => !v.is_used && (!v.expires_at || new Date(v.expires_at) > now));
        const usedVouchers = vouchers.filter(v => v.is_used);
        const expiredVouchers = vouchers.filter(v => !v.is_used && v.expires_at && new Date(v.expires_at) <= now);

        res.render('myVouchers', {
            user,
            activeVouchers,
            usedVouchers,
            expiredVouchers,
            messages: req.flash()
        });
    });
}

/**
 * Validate voucher (AJAX - used in cart/checkout)
 */
function validateVoucher(req, res) {
    const user = req.session.user;
    const code = (req.body.code || '').toString().trim().toUpperCase();
    const orderTotal = parseFloat(req.body.orderTotal) || 0;

    if (!code) {
        return res.json({ ok: false, error: 'Please enter a voucher code' });
    }

    Voucher.validateVoucher(code, user.id, orderTotal, (err, result) => {
        if (err) {
            console.error('Error validating voucher:', err);
            return res.json({ ok: false, error: 'Failed to validate voucher' });
        }

        if (!result.valid) {
            return res.json({ ok: false, error: result.error });
        }

        return res.json({
            ok: true,
            voucher: {
                id: result.voucher.id,
                code: result.voucher.code,
                type: result.voucher.type,
                value: result.voucher.value,
                minOrder: result.voucher.min_order
            },
            discount: result.discount
        });
    });
}

/**
 * Remove applied voucher from session (AJAX)
 */
function removeVoucher(req, res) {
    if (req.session.appliedVoucher) {
        delete req.session.appliedVoucher;
    }
    return res.json({ ok: true });
}

// ========================================
// Admin Functions
// ========================================

/**
 * Admin: List all vouchers
 */
function adminListVouchers(req, res) {
    const user = req.session.user;

    Voucher.getAllVouchers((err, vouchers) => {
        if (err) {
            console.error('Error fetching vouchers:', err);
            vouchers = [];
        }

        res.render('adminVouchers', { user, vouchers, messages: req.flash() });
    });
}

/**
 * Admin: Show create voucher form
 */
function adminShowCreateVoucher(req, res) {
    const user = req.session.user;
    res.render('adminVoucherForm', { user, voucher: null, messages: req.flash() });
}

/**
 * Admin: Create promotional voucher
 */
function adminCreateVoucher(req, res) {
    const voucher = {
        code: (req.body.code || '').toString().trim().toUpperCase(),
        user_id: req.body.user_id ? parseInt(req.body.user_id, 10) : null,
        type: req.body.type || 'percentage',
        value: parseFloat(req.body.value) || 10,
        min_order: parseFloat(req.body.min_order) || 0,
        max_discount: req.body.max_discount ? parseFloat(req.body.max_discount) : null,
        expires_at: req.body.expires_at || null
    };

    if (!voucher.value) {
        req.flash('error', 'Voucher value is required');
        return res.redirect('/admin/vouchers/create');
    }

    Voucher.createPromoVoucher(voucher, (err, result) => {
        if (err) {
            console.error('Error creating voucher:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'Voucher code already exists');
            } else {
                req.flash('error', 'Failed to create voucher');
            }
            return res.redirect('/admin/vouchers/create');
        }

        req.flash('success', `Voucher created: ${result.code}`);
        res.redirect('/admin/vouchers');
    });
}

/**
 * Admin: Delete voucher
 */
function adminDeleteVoucher(req, res) {
    const voucherId = parseInt(req.params.id, 10);

    Voucher.deleteVoucher(voucherId, (err) => {
        if (err) {
            console.error('Error deleting voucher:', err);
            req.flash('error', 'Failed to delete voucher');
        } else {
            req.flash('success', 'Voucher deleted');
        }
        res.redirect('/admin/vouchers');
    });
}

// ========================================
// Export
// ========================================
module.exports = {
    showMyVouchers,
    validateVoucher,
    removeVoucher,
    // Admin
    adminListVouchers,
    adminShowCreateVoucher,
    adminCreateVoucher,
    adminDeleteVoucher
};
