// ========================================
// Order Controller
// Handles all order-related business logic
// Now uses database-based cart for data persistence
// ========================================
const Order = require('../models/order');  // Order model
const cartModel = require('../models/cart');  // Cart model
const Voucher = require('../models/voucher');  // Voucher model
const alipaySandbox = require('../utils/alipaySandbox');
const paypalSandbox = require('../utils/paypalSandbox');
const netsSandbox = require('../utils/netsSandbox');

/**
 * Checkout function
 * Convert shopping cart items from database into an order
 */
function checkout(req, res) {
    const user = req.session.user;  // Get current user
    const voucherCode = (req.body.voucherCode || '').toString().trim().toUpperCase();

    console.log('=== Checkout Process Started ===');
    console.log('User ID:', user.id);
    console.log('Voucher Code:', voucherCode || 'None');

    // Get cart data from database
    cartModel.getCart(user.id, (err, cart) => {
        if (err) {
            console.error('Error fetching cart:', err);
            req.flash('error', 'Error loading cart. Please try again.');
            return res.redirect('/cart');
        }

        console.log('Cart items:', cart.length);

        // Check if cart is empty
        if (!cart || cart.length === 0) {
            console.log('Cart is empty, redirecting...');
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        // Validate cart items
        for (let item of cart) {
            if (!item.productId || !item.price || !item.quantity) {
                console.error('Invalid cart item:', item);
                req.flash('error', 'Invalid cart data. Please try again.');
                return res.redirect('/cart');
            }
        }

        // Calculate order total
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        console.log('Order subtotal:', subtotal);

        // Process voucher if provided
        const processOrder = (voucherData) => {
            const discount = voucherData ? voucherData.discount : 0;
            const total = subtotal - discount;

            console.log('Discount:', discount);
            console.log('Final total:', total);

            // Prepare order items data
            const items = cart.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price
            }));

            console.log('Creating order with items:', JSON.stringify(items));

            // Create order with voucher info
            Order.createWithVoucher(user.id, total, items, voucherData, (err, result) => {
                if (err) {
                    console.error('=== Error creating order ===');
                    console.error('Error details:', err);
                    req.flash('error', 'Failed to create order. Please try again or contact support.');
                    return res.redirect('/cart');
                }

                console.log('Order created successfully:', result);
                const orderId = result.orderId || result.insertId;

                // Mark voucher as used if applicable
                if (voucherData && voucherData.voucher) {
                    Voucher.useVoucher(voucherData.voucher.id, orderId, (vErr) => {
                        if (vErr) console.error('Error marking voucher as used:', vErr);
                    });
                }

                Order.updateStatus(orderId, 'Unpaid', (statusErr) => {
                    if (statusErr) {
                        console.error('Error setting order status to Unpaid:', statusErr);
                    }

                    // Clear cart from database after successful order
                    cartModel.clearCart(user.id, (clearErr) => {
                        if (clearErr) {
                            console.error('Error clearing cart:', clearErr);
                        }

                        req.flash('success', 'Order created. Please complete payment.');
                        res.redirect(`/order/${orderId}/pay`);
                    });
                });
            });
        };

        // Validate voucher if provided
        if (voucherCode) {
            Voucher.validateVoucher(voucherCode, user.id, subtotal, (err, result) => {
                if (err) {
                    console.error('Error validating voucher:', err);
                    req.flash('error', 'Error validating voucher');
                    return res.redirect('/cart');
                }

                if (!result.valid) {
                    req.flash('error', result.error || 'Invalid voucher');
                    return res.redirect('/cart');
                }

                processOrder(result);
            });
        } else {
            processOrder(null);
        }
    });
}

/**
 * View user's own order list
 * Display all orders for the current user
 */
function listUserOrders(req, res) {
    const user = req.session.user;  // Get current user
    
    // Query all orders for the user
    Order.getByUserId(user.id, (err, orders) => {
        if (err) {
            console.error('Error fetching orders:', err);
            return res.render('orders', { orders: [], error: 'Failed to load orders', user });
        }
        
        res.render('orders', { orders, error: null, user, messages: req.flash() });
    });
}

/**
 * View all orders (admin only)
 * Admin can view all orders from all users in the system
 */
function listAllOrders(req, res) {
    const user = req.session.user;  // Get current user (should be admin)
    
    // Query all orders
    Order.getAll((err, orders) => {
        if (err) {
            console.error('Error fetching all orders:', err);
            return res.render('adminOrders', { orders: [], error: 'Failed to load orders', user });
        }
        
        res.render('adminOrders', { orders, error: null, user });
    });
}

/**
 * View order details
 * Display detailed information for a single order
 * Users can only view their own orders, admins can view all orders
 */
function viewOrder(req, res) {
    const user = req.session.user;  // Get current user
    const orderId = parseInt(req.params.id, 10);  // Get order ID from URL
    
    // Validate order ID
    if (Number.isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/orders');
    }
    
    // Query order information
    Order.getById(orderId, (err, order) => {
        if (err) {
            console.error('Error fetching order:', err);
            req.flash('error', 'Failed to load order');
            return res.redirect('/orders');
        }
        
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }
        
        // Check if user has permission to view this order (order owner or admin)
        if (user.role !== 'admin' && order.user_id !== user.id) {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }
        
        res.render('orderDetails', { order, error: null, user, messages: req.flash() });
    });
}

/**
 * Update order status (admin only)
 * Admin can change order processing status (e.g., pending, shipped, completed, etc.)
 */
function updateStatus(req, res) {
    const orderId = parseInt(req.params.id, 10);  // Get order ID from URL
    const status = req.body.status;  // Get new status
    
    // Validate request parameters
    if (Number.isNaN(orderId) || !status) {
        req.flash('error', 'Invalid request');
        return res.redirect('/admin/orders');
    }
    
    // Update order status
    Order.updateStatus(orderId, status, (err) => {
        if (err) {
            console.error('Error updating order status:', err);
            req.flash('error', 'Failed to update order status');
        } else {
            req.flash('success', 'Order status updated successfully');
        }
        res.redirect('/admin/orders');  // Return to admin orders page
    });
}

/**
 * Delete order (admin only)
 * Admin can delete order records
 */
function deleteOrder(req, res) {
    const orderId = parseInt(req.params.id, 10);  // Get order ID from URL
    
    // Validate order ID
    if (Number.isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/admin/orders');
    }
    
    // Delete order
    Order.delete(orderId, (err) => {
        if (err) {
            console.error('Error deleting order:', err);
            req.flash('error', 'Failed to delete order');
        } else {
            req.flash('success', 'Order deleted successfully');
        }
        res.redirect('/admin/orders');  // Return to admin orders page
    });
}

/**
 * Print order invoice
 * Display order details in print-friendly format
 */
function printOrder(req, res) {
    const user = req.session.user;
    const orderId = parseInt(req.params.id, 10);
    
    if (Number.isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/orders');
    }
    
    // Get order details
    Order.getById(orderId, (err, order) => {
        if (err || !order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }
        
        // Check permissions
        if (user.role !== 'admin' && order.user_id !== user.id) {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }
        
        // Render invoice template for printing
        res.render('orderInvoice', { 
            order, 
            items: order.items || [],
            user: user,
            autoPrint: false  // Don't auto-print, let user click print button
        });
    });
}

/**
 * Download order invoice as PDF
 * Opens print dialog with auto-print enabled
 */
function downloadPDF(req, res) {
    const user = req.session.user;
    const orderId = parseInt(req.params.id, 10);
    
    if (Number.isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/orders');
    }
    
    // Get order details
    Order.getById(orderId, (err, order) => {
        if (err || !order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }
        
        // Check permissions
        if (user.role !== 'admin' && order.user_id !== user.id) {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }
        
        // Render invoice template with auto-print enabled
        res.render('orderInvoice', { 
            order, 
            items: order.items || [],
            user: user,
            autoPrint: true  // Auto-open print dialog for PDF download
        });
    });
}

// Calculate delivery fee based on order subtotal (free delivery for >= 60)
function calcDeliveryFee(subtotal) {
    const sub = Number(subtotal);
    if (!Number.isFinite(sub)) return 0;
    return sub >= 60 ? 0 : 5;
}

// Render the payment page for an unpaid order
function showOrderPayPage(req, res) {
    const user = req.session.user;
    const orderId = parseInt(req.params.id, 10);

    if (Number.isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/orders');
    }

    Order.getById(orderId, (err, order) => {
        if (err || !order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }

        if (order.user_id !== user.id && user.role !== 'admin') {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }

        if ((order.status || '').toString().toLowerCase() === 'paid') {
            req.flash('success', 'Order already paid');
            return res.redirect(`/order/${orderId}`);
        }

        res.render('orderPay', {
            user,
            order,
            messages: req.flash()
        });
    });
}

// Create a provider payment and return checkout URL (AJAX)
function startOrderPayment(req, res) {
    const user = req.session.user;
    const orderId = parseInt(req.params.id, 10);
    const paymentMethod = (req.body.paymentMethod || '').toString().trim().toLowerCase();

    if (Number.isNaN(orderId)) return paypalSandbox.safeJson(res, 400, { ok: false, error: 'Invalid order ID' });
    if (paymentMethod !== 'alipay' && paymentMethod !== 'paypal' && paymentMethod !== 'nets') {
        return paypalSandbox.safeJson(res, 400, { ok: false, error: 'Invalid payment method' });
    }

    Order.getById(orderId, async (err, order) => {
        if (err || !order) return paypalSandbox.safeJson(res, 404, { ok: false, error: 'Order not found' });
        if (order.user_id !== user.id && user.role !== 'admin') return paypalSandbox.safeJson(res, 403, { ok: false, error: 'Access denied' });

        if ((order.status || '').toString().toLowerCase() === 'paid') {
            return paypalSandbox.safeJson(res, 200, { ok: true, alreadyPaid: true });
        }

        const outTradeNo = `ORDER_${order.id}_${Date.now()}`;
        const subtotal = Number(order.total);
        const amount = (Number.isFinite(subtotal) ? subtotal : 0) + calcDeliveryFee(subtotal);
        const orderForPay = { ...order, total: amount };

        try {
            if (paymentMethod === 'alipay') {
                const created = alipaySandbox.buildOrderPayUrl(req, orderForPay, outTradeNo);
                Order.startPayment(order.id, order.user_id, 'alipay', created.outTradeNo, null, (e) => {
                    if (e) return paypalSandbox.safeJson(res, 500, { ok: false, error: e.message || 'Failed to start payment' });
                    return paypalSandbox.safeJson(res, 200, { ok: true, outTradeNo: created.outTradeNo, url: created.url });
                });
                return;
            }

            if (paymentMethod === 'paypal') {
                const created = await paypalSandbox.buildOrderPayUrl(req, orderForPay, outTradeNo);
                Order.startPayment(order.id, order.user_id, 'paypal', created.outTradeNo, created.providerOrderId, (e) => {
                    if (e) return paypalSandbox.safeJson(res, 500, { ok: false, error: e.message || 'Failed to start payment' });
                    return paypalSandbox.safeJson(res, 200, { ok: true, outTradeNo: created.outTradeNo, url: created.url });
                });
                return;
            }

            const netsCreated = await netsSandbox.buildOrderPayUrl(req, outTradeNo, amount);
            Order.startPayment(order.id, order.user_id, 'nets', outTradeNo, netsCreated.txnRetrievalRef, (e) => {
                if (e) return paypalSandbox.safeJson(res, 500, { ok: false, error: e.message || 'Failed to start payment' });
                return paypalSandbox.safeJson(res, 200, { ok: true, outTradeNo, url: netsCreated.url, sseUrl: netsCreated.sseUrl });
            });
        } catch (e) {
            return paypalSandbox.safeJson(res, 500, { ok: false, error: e && e.message ? e.message : 'Failed to start payment' });
        }
    });
}

// Query provider payment status and mark the order as paid when completed (AJAX)
function checkOrderPaymentStatus(req, res) {
    const user = req.session.user;
    const orderId = parseInt(req.params.id, 10);
    const outTradeNo = (req.query.out_trade_no || '').toString().trim();

    if (Number.isNaN(orderId)) return paypalSandbox.safeJson(res, 400, { ok: false, error: 'Invalid order ID' });
    if (!outTradeNo) return paypalSandbox.safeJson(res, 400, { ok: false, error: 'Missing out_trade_no' });

    Order.getById(orderId, async (err, order) => {
        if (err || !order) return paypalSandbox.safeJson(res, 404, { ok: false, error: 'Order not found' });
        if (order.user_id !== user.id && user.role !== 'admin') return paypalSandbox.safeJson(res, 403, { ok: false, error: 'Access denied' });

        if ((order.status || '').toString().toLowerCase() === 'paid') {
            return paypalSandbox.safeJson(res, 200, { ok: true, paid: true });
        }

        if (order.payment_out_trade_no && String(order.payment_out_trade_no) !== outTradeNo) {
            return paypalSandbox.safeJson(res, 400, { ok: false, error: 'out_trade_no not match this order' });
        }

        const method = (order.payment_method || '').toString().trim().toLowerCase();

        if (method === 'alipay') {
            const result = await alipaySandbox.queryOrderPaid(req, order.id, outTradeNo);
            if (!result.ok) return paypalSandbox.safeJson(res, 500, { ok: false, error: result.error || 'Failed to query Alipay' });
            if (!result.paid) return paypalSandbox.safeJson(res, 200, { ok: true, paid: false, tradeStatus: result.tradeStatus || null, error: result.error || null });

            return Order.markPaid(order.id, order.user_id, result.tradeNo || null, (e) => {
                if (e) return paypalSandbox.safeJson(res, 500, { ok: false, error: e.message || 'Failed to mark paid' });
                return paypalSandbox.safeJson(res, 200, { ok: true, paid: true, tradeStatus: result.tradeStatus || null });
            });
        }

        if (method === 'paypal') {
            const result = await paypalSandbox.queryOrderPaid(req, order.id, order.payment_provider_ref);
            if (!result.ok) return paypalSandbox.safeJson(res, 500, { ok: false, error: result.error || 'Failed to query PayPal' });
            if (!result.paid) return paypalSandbox.safeJson(res, 200, { ok: true, paid: false, orderStatus: result.orderStatus || null, error: result.error || null });

            return Order.markPaid(order.id, order.user_id, result.captureId || order.payment_provider_ref || null, (e) => {
                if (e) return paypalSandbox.safeJson(res, 500, { ok: false, error: e.message || 'Failed to mark paid' });
                return paypalSandbox.safeJson(res, 200, { ok: true, paid: true, orderStatus: 'COMPLETED' });
            });
        }

        if (method === 'nets') {
            const txnRetrievalRef = order.payment_provider_ref ? String(order.payment_provider_ref) : null;
            if (!txnRetrievalRef) return paypalSandbox.safeJson(res, 200, { ok: true, paid: false, error: 'NETS session expired. Please start payment again.' });

            const result = await netsSandbox.queryPaid(req, txnRetrievalRef);
            if (!result.ok) return paypalSandbox.safeJson(res, 500, { ok: false, error: result.error || 'Failed to query NETS' });
            if (!result.paid) return paypalSandbox.safeJson(res, 200, { ok: true, paid: false, responseCode: result.responseCode || null, txnStatus: result.txnStatus || null, actionCode: result.actionCode || null, error: result.error || null });

            return Order.markPaid(order.id, order.user_id, txnRetrievalRef, (e) => {
                if (e) return paypalSandbox.safeJson(res, 500, { ok: false, error: e.message || 'Failed to mark paid' });
                return paypalSandbox.safeJson(res, 200, { ok: true, paid: true, responseCode: result.responseCode || null, txnStatus: result.txnStatus || null });
            });
        }

        return paypalSandbox.safeJson(res, 400, { ok: false, error: 'Order payment method not started' });
    });
}

// Final landing page after provider redirect (requires order already marked paid)
function finishOrderPayment(req, res) {
    const user = req.session.user;
    const orderId = parseInt(req.params.id, 10);
    const outTradeNo = (req.query.out_trade_no || '').toString().trim();

    if (Number.isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/orders');
    }

    Order.getById(orderId, (err, order) => {
        if (err || !order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }

        if (order.user_id !== user.id && user.role !== 'admin') {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }

        if (outTradeNo && order.payment_out_trade_no && String(order.payment_out_trade_no) !== outTradeNo) {
            req.flash('error', 'out_trade_no not match this order');
            return res.redirect(`/order/${orderId}/pay`);
        }

        if ((order.status || '').toString().toLowerCase() !== 'paid') {
            req.flash('error', 'Payment not completed');
            return res.redirect(`/order/${orderId}/pay`);
        }

        req.flash('success', 'Payment successful');
        res.redirect(`/order/${orderId}`);
    });
}

// NETS QR payment page (shows QR and SSE url)
function netsPayPage(req, res) {
    const user = req.session.user;
    const outTradeNo = (req.query.out_trade_no || '').toString().trim();
    if (!outTradeNo) {
        req.flash('error', 'Missing out_trade_no');
        return res.redirect('/orders');
    }

    Order.getByOutTradeNo(outTradeNo, async (err, order) => {
        if (err || !order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }

        if (order.user_id !== user.id && user.role !== 'admin') {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }

        const method = (order.payment_method || '').toString().trim().toLowerCase();
        if (method !== 'nets') {
            req.flash('error', 'Invalid payment method');
            return res.redirect(`/order/${order.id}/pay`);
        }

        try {
            const subtotal = Number(order.total);
            const amount = (Number.isFinite(subtotal) ? subtotal : 0) + calcDeliveryFee(subtotal);
            const { session } = await netsSandbox.getOrCreateSession(req, outTradeNo, amount);
            res.render('netsPay', {
                user,
                order,
                outTradeNo,
                amount: amount.toFixed(2),
                txnRetrievalRef: session.txnRetrievalRef,
                sseUrl: `/nets/sse/payment-status/${encodeURIComponent(session.txnRetrievalRef)}?out_trade_no=${encodeURIComponent(outTradeNo)}`,
                qrCodeUrl: `data:image/png;base64,${session.qrCodeBase64}`
            });
        } catch (e) {
            req.flash('error', e && e.message ? e.message : 'Failed to load NETS payment');
            res.redirect(`/order/${order.id}/pay`);
        }
    });
}

// NETS payment status SSE stream (server polls provider and pushes events)
function netsPaymentSse(req, res) {
    const user = req.session.user;
    const txnRetrievalRef = (req.params.txnRetrievalRef || '').toString().trim();
    const outTradeNo = (req.query.out_trade_no || '').toString().trim();
    if (!txnRetrievalRef || !outTradeNo) return res.status(400).end();

    Order.getByOutTradeNo(outTradeNo, async (err, order) => {
        if (err || !order) return res.status(404).end();
        if (order.user_id !== user.id && user.role !== 'admin') return res.status(403).end();

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        let closed = false;
        const close = () => {
            closed = true;
            try {
                res.end();
            } catch (e) {}
        };

        req.on('close', close);

        const send = (obj) => {
            if (closed) return;
            res.write(`data: ${JSON.stringify(obj)}\n\n`);
        };

        const startedAt = Date.now();

        while (!closed) {
            if (Date.now() - startedAt > 10 * 60 * 1000) {
                send({ fail: true, message: 'timeout' });
                close();
                return;
            }

            const result = await netsSandbox.queryPaid(req, txnRetrievalRef);
            if (!result.ok) {
                send({ fail: true, message: result.error || 'nets_error' });
                close();
                return;
            }

            if (result.paid) {
                await new Promise((resolve) => {
                    Order.markPaid(order.id, order.user_id, txnRetrievalRef, () => resolve());
                });
                send({ success: true });
                close();
                return;
            }

            send({ pending: true, result });
            await new Promise((r) => setTimeout(r, 2000));
        }
    });
}

// ========================================
// Export all controller functions
// ========================================
module.exports = {
    checkout,          // Checkout function
    listUserOrders,    // View user orders
    listAllOrders,     // View all orders (admin)
    viewOrder,         // View order details
    updateStatus,      // Update order status (admin)
    deleteOrder,       // Delete order (admin)
    printOrder,        // Print order invoice
    downloadPDF,       // Download order as PDF
    showOrderPayPage,
    startOrderPayment,
    checkOrderPaymentStatus,
    finishOrderPayment,
    netsPayPage,
    netsPaymentSse
};
