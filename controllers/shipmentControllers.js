// ========================================
// Shipment Controller
// Handles shipment tracking business logic
// [NEW FILE] Created for shipment tracking feature
// ========================================
const Shipment = require('../models/shipment');
const Order = require('../models/order');

/**
 * Track shipment by tracking number (public)
 */
function trackShipment(req, res) {
    const user = req.session.user;
    const trackingNumber = (req.query.tracking || req.params.tracking || '').toString().trim().toUpperCase();

    if (!trackingNumber) {
        return res.render('trackShipment', {
            user,
            shipment: null,
            tracking: [],
            error: null,
            messages: req.flash()
        });
    }

    Shipment.getByTrackingNumber(trackingNumber, (err, shipment) => {
        if (err) {
            console.error('Error fetching shipment:', err);
            return res.render('trackShipment', {
                user,
                shipment: null,
                tracking: [],
                error: 'Error looking up shipment',
                messages: req.flash()
            });
        }

        if (!shipment) {
            return res.render('trackShipment', {
                user,
                shipment: null,
                tracking: [],
                error: 'Shipment not found',
                trackingNumber,
                messages: req.flash()
            });
        }

        // Get tracking history
        Shipment.getTrackingHistory(shipment.id, (trackErr, tracking) => {
            res.render('trackShipment', {
                user,
                shipment,
                tracking: tracking || [],
                error: null,
                trackingNumber,
                messages: req.flash()
            });
        });
    });
}

/**
 * View shipment for an order
 */
function viewOrderShipment(req, res) {
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
        if (user.role !== 'admin' && order.user_id !== user.id) {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }

        Shipment.getByOrderId(orderId, (shipErr, shipment) => {
            if (shipErr) {
                console.error('Error fetching shipment:', shipErr);
            }

            if (!shipment) {
                return res.render('orderShipment', {
                    user,
                    order,
                    shipment: null,
                    tracking: [],
                    messages: req.flash()
                });
            }

            Shipment.getTrackingHistory(shipment.id, (trackErr, tracking) => {
                res.render('orderShipment', {
                    user,
                    order,
                    shipment,
                    tracking: tracking || [],
                    messages: req.flash()
                });
            });
        });
    });
}

/**
 * User's shipments list
 */
function listUserShipments(req, res) {
    const user = req.session.user;

    Shipment.getUserShipments(user.id, (err, shipments) => {
        if (err) {
            console.error('Error fetching shipments:', err);
            shipments = [];
        }

        res.render('myShipments', {
            user,
            shipments,
            messages: req.flash()
        });
    });
}

// ========================================
// Admin Functions
// ========================================

/**
 * Admin: List all shipments
 */
function adminListShipments(req, res) {
    const user = req.session.user;

    Shipment.getAll((err, shipments) => {
        if (err) {
            console.error('Error fetching shipments:', err);
            shipments = [];
        }

        res.render('adminShipments', {
            user,
            shipments,
            messages: req.flash()
        });
    });
}

/**
 * Admin: Ship an order
 */
function adminShipOrder(req, res) {
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/admin/orders');
    }

    Order.getById(orderId, (err, order) => {
        if (err || !order) {
            req.flash('error', 'Order not found');
            return res.redirect('/admin/orders');
        }

        if (order.status !== 'Paid') {
            req.flash('error', 'Only paid orders can be shipped');
            return res.redirect('/admin/orders');
        }

        Shipment.shipOrder(orderId, order, (shipErr, shipment) => {
            if (shipErr) {
                console.error('Error shipping order:', shipErr);
                req.flash('error', 'Failed to ship order');
                return res.redirect('/admin/orders');
            }

            // Update order status
            Order.updateStatus(orderId, 'Shipped', () => {
                req.flash('success', `Order shipped! Tracking: ${shipment.trackingNumber}`);
                res.redirect('/admin/shipments');
            });
        });
    });
}

/**
 * Admin: View/Edit shipment
 */
function adminViewShipment(req, res) {
    const user = req.session.user;
    const shipmentId = parseInt(req.params.id, 10);

    if (isNaN(shipmentId)) {
        req.flash('error', 'Invalid shipment ID');
        return res.redirect('/admin/shipments');
    }

    Shipment.getById(shipmentId, (err, shipment) => {
        if (err || !shipment) {
            req.flash('error', 'Shipment not found');
            return res.redirect('/admin/shipments');
        }

        Shipment.getTrackingHistory(shipmentId, (trackErr, tracking) => {
            Order.getById(shipment.order_id, (orderErr, order) => {
                res.render('adminShipmentDetail', {
                    user,
                    shipment,
                    order: order || {},
                    tracking: tracking || [],
                    messages: req.flash()
                });
            });
        });
    });
}

/**
 * Admin: Update shipment status
 */
function adminUpdateShipmentStatus(req, res) {
    const shipmentId = parseInt(req.params.id, 10);
    const { status, location, description } = req.body;

    if (isNaN(shipmentId) || !status) {
        req.flash('error', 'Invalid request');
        return res.redirect('/admin/shipments');
    }

    Shipment.updateStatus(shipmentId, status, (err) => {
        if (err) {
            console.error('Error updating shipment:', err);
            req.flash('error', 'Failed to update shipment');
            return res.redirect(`/admin/shipment/${shipmentId}`);
        }

        // Add tracking record
        Shipment.addTrackingRecord(shipmentId, status, location || null, description || `Status updated to ${status}`, () => {
            // Update order status if delivered
            Shipment.getById(shipmentId, (getErr, shipment) => {
                if (shipment && status === 'Delivered') {
                    Order.updateStatus(shipment.order_id, 'Delivered', () => {
                        req.flash('success', 'Shipment status updated');
                        res.redirect(`/admin/shipment/${shipmentId}`);
                    });
                } else {
                    req.flash('success', 'Shipment status updated');
                    res.redirect(`/admin/shipment/${shipmentId}`);
                }
            });
        });
    });
}

/**
 * Admin: Add tracking record
 */
function adminAddTracking(req, res) {
    const shipmentId = parseInt(req.params.id, 10);
    const { status, location, description } = req.body;

    if (isNaN(shipmentId) || !description) {
        req.flash('error', 'Description is required');
        return res.redirect(`/admin/shipment/${shipmentId}`);
    }

    Shipment.addTrackingRecord(shipmentId, status || 'Update', location || null, description, (err) => {
        if (err) {
            console.error('Error adding tracking:', err);
            req.flash('error', 'Failed to add tracking record');
        } else {
            req.flash('success', 'Tracking record added');
        }
        res.redirect(`/admin/shipment/${shipmentId}`);
    });
}

// ========================================
// Export
// ========================================
module.exports = {
    trackShipment,
    viewOrderShipment,
    listUserShipments,
    // Admin
    adminListShipments,
    adminShipOrder,
    adminViewShipment,
    adminUpdateShipmentStatus,
    adminAddTracking
};
