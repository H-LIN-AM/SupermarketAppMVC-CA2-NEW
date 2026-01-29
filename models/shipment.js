// ========================================
// Shipment Model
// Handles database operations for shipment tracking
// [NEW FILE] Created for shipment tracking feature
// ========================================
const db = require('../db');

/**
 * Generate tracking number
 * Format: HBM + timestamp + random
 */
function generateTrackingNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `HBM${timestamp}${random}`;
}

/**
 * Create shipment for an order
 */
function createShipment(orderId, recipientInfo, callback) {
    const trackingNumber = generateTrackingNumber();
    const sql = `
        INSERT INTO shipments
        (order_id, tracking_number, recipient_name, recipient_address, recipient_phone, status)
        VALUES (?, ?, ?, ?, ?, 'Processing')
    `;
    db.query(sql, [
        orderId,
        trackingNumber,
        recipientInfo.name,
        recipientInfo.address,
        recipientInfo.phone
    ], (err, result) => {
        if (err) return callback(err);

        // Add initial tracking record
        addTrackingRecord(result.insertId, 'Processing', null, 'Order received and being processed', (trackErr) => {
            if (trackErr) console.error('Error adding initial tracking:', trackErr);
            callback(null, { id: result.insertId, trackingNumber });
        });
    });
}

/**
 * Get shipment by order ID
 */
function getByOrderId(orderId, callback) {
    const sql = `
        SELECT s.*,
               (SELECT COUNT(*) FROM shipment_tracking WHERE shipment_id = s.id) as tracking_count
        FROM shipments s
        WHERE s.order_id = ?
        ORDER BY s.created_at DESC
        LIMIT 1
    `;
    db.query(sql, [orderId], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0] || null);
    });
}

/**
 * Get shipment by ID
 */
function getById(shipmentId, callback) {
    const sql = 'SELECT * FROM shipments WHERE id = ?';
    db.query(sql, [shipmentId], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0] || null);
    });
}

/**
 * Get shipment by tracking number
 */
function getByTrackingNumber(trackingNumber, callback) {
    const sql = `
        SELECT s.*, o.user_id, o.total, o.status as order_status,
               u.username, u.email
        FROM shipments s
        JOIN orders o ON s.order_id = o.id
        JOIN users u ON o.user_id = u.id
        WHERE s.tracking_number = ?
    `;
    db.query(sql, [trackingNumber], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0] || null);
    });
}

/**
 * Get all shipments (admin)
 */
function getAll(callback) {
    const sql = `
        SELECT s.*, o.total, o.status as order_status,
               u.username, u.email
        FROM shipments s
        JOIN orders o ON s.order_id = o.id
        JOIN users u ON o.user_id = u.id
        ORDER BY s.created_at DESC
    `;
    db.query(sql, [], callback);
}

/**
 * Get tracking history for a shipment
 */
function getTrackingHistory(shipmentId, callback) {
    const sql = `
        SELECT * FROM shipment_tracking
        WHERE shipment_id = ?
        ORDER BY created_at DESC
    `;
    db.query(sql, [shipmentId], callback);
}

/**
 * Add tracking record
 */
function addTrackingRecord(shipmentId, status, location, description, callback) {
    const sql = `
        INSERT INTO shipment_tracking (shipment_id, status, location, description)
        VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [shipmentId, status, location, description], callback);
}

/**
 * Update shipment status
 */
function updateStatus(shipmentId, status, callback) {
    let sql = 'UPDATE shipments SET status = ?';
    const params = [status];

    // Set timestamps based on status
    if (status === 'Shipped') {
        sql += ', shipped_at = NOW()';
    } else if (status === 'Delivered') {
        sql += ', delivered_at = NOW()';
    }

    sql += ' WHERE id = ?';
    params.push(shipmentId);

    db.query(sql, params, callback);
}

/**
 * Update shipment details (admin)
 */
function updateShipment(shipmentId, data, callback) {
    const sql = `
        UPDATE shipments SET
        tracking_number = COALESCE(?, tracking_number),
        carrier = COALESCE(?, carrier),
        status = COALESCE(?, status),
        estimated_delivery = ?,
        notes = ?
        WHERE id = ?
    `;
    db.query(sql, [
        data.tracking_number,
        data.carrier,
        data.status,
        data.estimated_delivery || null,
        data.notes || null,
        shipmentId
    ], callback);
}

/**
 * Ship order (admin action)
 * Creates shipment if not exists, updates status to Shipped
 */
function shipOrder(orderId, orderInfo, callback) {
    getByOrderId(orderId, (err, existingShipment) => {
        if (err) return callback(err);

        if (existingShipment) {
            // Update existing shipment
            updateStatus(existingShipment.id, 'Shipped', (updateErr) => {
                if (updateErr) return callback(updateErr);

                addTrackingRecord(existingShipment.id, 'Shipped', 'HB Mart Warehouse', 'Package has been shipped', (trackErr) => {
                    callback(null, existingShipment);
                });
            });
        } else {
            // Create new shipment
            createShipment(orderId, {
                name: orderInfo.username,
                address: orderInfo.address,
                phone: orderInfo.contact
            }, (createErr, newShipment) => {
                if (createErr) return callback(createErr);

                updateStatus(newShipment.id, 'Shipped', (updateErr) => {
                    if (updateErr) return callback(updateErr);

                    addTrackingRecord(newShipment.id, 'Shipped', 'HB Mart Warehouse', 'Package has been shipped', () => {
                        callback(null, newShipment);
                    });
                });
            });
        }
    });
}

/**
 * Get user's shipments
 */
function getUserShipments(userId, callback) {
    const sql = `
        SELECT s.*, o.id as order_id, o.total
        FROM shipments s
        JOIN orders o ON s.order_id = o.id
        WHERE o.user_id = ?
        ORDER BY s.created_at DESC
    `;
    db.query(sql, [userId], callback);
}

// ========================================
// Export
// ========================================
module.exports = {
    generateTrackingNumber,
    createShipment,
    getByOrderId,
    getById,
    getByTrackingNumber,
    getAll,
    getTrackingHistory,
    addTrackingRecord,
    updateStatus,
    updateShipment,
    shipOrder,
    getUserShipments
};
