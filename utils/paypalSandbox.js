const https = require('https');

// Minimal PayPal sandbox integration for order payments (create + query + capture)
function safeJson(res, statusCode, payload) {
    if (!res || res.headersSent || res.writableEnded) return;
    res.status(statusCode).json(payload);
}

// Build provider config for an order payment request
function getConfig(req, orderId, outTradeNo) {
    const apiBase = (process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com').trim();
    const clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
    const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
    const brandName = (process.env.PAYPAL_BRAND_NAME || 'HB Mart').trim();
    const rawBaseUrl = (process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`).trim();
    const appBaseUrl = rawBaseUrl.replace(/\/+$/, '');

    const baseReturnUrl = `${appBaseUrl}/order/${encodeURIComponent(orderId)}/pay`;
    const qs = outTradeNo ? `?pm=paypal&out_trade_no=${encodeURIComponent(outTradeNo)}` : '';
    const returnUrl = `${baseReturnUrl}${qs}`;
    const cancelUrl = `${baseReturnUrl}${qs ? `${qs}&cancel=paypal` : '?cancel=paypal'}`;

    return { apiBase, clientId, clientSecret, brandName, appBaseUrl, returnUrl, cancelUrl };
}

// Validate required env config
function assertConfig(config) {
    if (!config.apiBase) return 'Missing PAYPAL_API_BASE in .env';
    if (!config.clientId) return 'Missing PAYPAL_CLIENT_ID in .env';
    if (!config.clientSecret) return 'Missing PAYPAL_CLIENT_SECRET in .env';
    return null;
}

function formatMoney(amount) {
    const num = Number(amount);
    if (!Number.isFinite(num)) return null;
    return num.toFixed(2);
}

// Make an HTTPS request and parse JSON response
function httpsRequestJson(method, urlStr, headers, body) {
    const url = new URL(urlStr);
    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method,
                headers
            },
            (res) => {
                let raw = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => (raw += chunk));
                res.on('end', () => {
                    const ok = res.statusCode >= 200 && res.statusCode < 300;
                    if (!ok) {
                        return reject(new Error(`PayPal HTTP ${res.statusCode}: ${raw.slice(0, 300)}`));
                    }
                    try {
                        resolve(raw ? JSON.parse(raw) : {});
                    } catch (e) {
                        reject(new Error(`Invalid PayPal response: ${raw.slice(0, 300)}`));
                    }
                });
            }
        );
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

// Fetch OAuth2 access token using client credentials
async function getAccessToken(config) {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`, 'utf8').toString('base64');
    const body = 'grant_type=client_credentials';
    const data = await httpsRequestJson(
        'POST',
        `${config.apiBase}/v1/oauth2/token`,
        {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body)
        },
        body
    );
    const token = data && data.access_token ? String(data.access_token) : null;
    if (!token) throw new Error('PayPal access token missing');
    return token;
}

// Create a PayPal order and return the approve URL
async function createOrder(config, outTradeNo, amount) {
    const token = await getAccessToken(config);
    const bodyObj = {
        intent: 'CAPTURE',
        purchase_units: [
            {
                reference_id: outTradeNo,
                custom_id: outTradeNo,
                description: 'Order payment',
                amount: { currency_code: 'USD', value: formatMoney(amount) }
            }
        ],
        application_context: {
            brand_name: config.brandName,
            return_url: config.returnUrl,
            cancel_url: config.cancelUrl,
            user_action: 'PAY_NOW'
        }
    };

    const body = JSON.stringify(bodyObj);
    const data = await httpsRequestJson(
        'POST',
        `${config.apiBase}/v2/checkout/orders`,
        {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        },
        body
    );

    const orderId = data && data.id ? String(data.id) : null;
    const links = data && Array.isArray(data.links) ? data.links : [];
    const approveLink = links.find((l) => l && l.rel === 'approve' && l.href);
    const approveUrl = approveLink ? String(approveLink.href) : null;

    if (!orderId || !approveUrl) throw new Error('PayPal create order response missing approve link');
    return { orderId, approveUrl };
}

// Get order details by provider order id
async function getOrder(config, orderId) {
    const token = await getAccessToken(config);
    return httpsRequestJson('GET', `${config.apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}`, { Authorization: `Bearer ${token}` });
}

// Capture an approved order (needed when status is APPROVED)
async function captureOrder(config, orderId) {
    const token = await getAccessToken(config);
    return httpsRequestJson(
        'POST',
        `${config.apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': 2
        },
        '{}'
    );
}

// Extract capture id from capture payload when available
function extractCaptureId(payload) {
    try {
        const pu = payload && payload.purchase_units && payload.purchase_units[0] ? payload.purchase_units[0] : null;
        const payments = pu && pu.payments ? pu.payments : null;
        const captures = payments && payments.captures && payments.captures[0] ? payments.captures[0] : null;
        return captures && captures.id ? String(captures.id) : null;
    } catch (e) {
        return null;
    }
}

// Create PayPal payment and return the browser approve URL
function buildOrderPayUrl(req, order, outTradeNoOverride) {
    const outTradeNo = outTradeNoOverride || `ORDER_${order.id}_${Date.now()}`;
    const config = getConfig(req, order.id, outTradeNo);
    const configError = assertConfig(config);
    if (configError) throw new Error(configError);

    return createOrder(config, outTradeNo, order.total).then((created) => {
        return { outTradeNo, url: created.approveUrl, providerOrderId: created.orderId };
    });
}

// Query provider status and try capture when needed
async function queryOrderPaid(req, orderId, providerOrderId) {
    const config = getConfig(req, orderId);
    const configError = assertConfig(config);
    if (configError) return { ok: false, error: configError };
    if (!providerOrderId) return { ok: true, paid: false, orderStatus: null };

    try {
        const order = await getOrder(config, providerOrderId);
        const orderStatus = order && order.status ? String(order.status) : null;

        if (orderStatus === 'APPROVED') {
            const captured = await captureOrder(config, providerOrderId);
            const captureStatus = captured && captured.status ? String(captured.status) : null;
            if (captureStatus === 'COMPLETED') {
                const captureId = extractCaptureId(captured);
                return { ok: true, paid: true, orderStatus: 'COMPLETED', captureId: captureId || null };
            }
        }

        if (orderStatus === 'COMPLETED') {
            const captureId = extractCaptureId(order);
            return { ok: true, paid: true, orderStatus: 'COMPLETED', captureId: captureId || null };
        }

        return { ok: true, paid: false, orderStatus };
    } catch (e) {
        return { ok: true, paid: false, error: e && e.message ? e.message : 'Failed to query PayPal order' };
    }
}

module.exports = {
    safeJson,
    buildOrderPayUrl,
    queryOrderPaid
};
