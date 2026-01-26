const crypto = require('crypto');
const https = require('https');

// Minimal Alipay sandbox integration for order payments (page pay + query)
function nowTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Read keys from .env (supports multi-line by using \n)
function parseKeyFromEnv(value) {
    if (!value) return null;
    return value.toString().replace(/\\n/g, '\n').trim();
}

function looksLikeBase64Der(value) {
    if (!value) return false;
    const s = value.toString().trim();
    if (s.includes('-----BEGIN')) return false;
    if (s.length < 100) return false;
    return /^[A-Za-z0-9+/=]+$/.test(s);
}

function loadPrivateKey(privateKeyValue) {
    const keyText = parseKeyFromEnv(privateKeyValue);
    if (!keyText) return null;

    if (keyText.includes('-----BEGIN')) {
        return keyText;
    }

    if (looksLikeBase64Der(keyText)) {
        const der = Buffer.from(keyText, 'base64');
        try {
            return crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
        } catch (e1) {
            try {
                return crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs1' });
            } catch (e2) {
                throw new Error('Invalid ALIPAY_PRIVATE_KEY (DER base64 is not a supported private key)');
            }
        }
    }

    throw new Error('Invalid ALIPAY_PRIVATE_KEY format');
}

// Build provider config for an order payment request
function getConfig(req, orderId) {
    const gateway = (process.env.ALIPAY_GATEWAY || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do').trim();
    const appId = (process.env.ALIPAY_APP_ID || '').trim();
    const privateKey = loadPrivateKey(process.env.ALIPAY_PRIVATE_KEY);
    const subject = (process.env.ALIPAY_SUBJECT || 'Order Payment').trim();
    const rawBaseUrl = (process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`).trim();
    const appBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    const returnUrl = `${appBaseUrl}/order/${encodeURIComponent(orderId)}/pay`;

    return { gateway, appId, privateKey, subject, appBaseUrl, returnUrl };
}

// Validate required env config
function assertConfig(config) {
    if (!config.appId) return 'Missing ALIPAY_APP_ID in .env';
    if (!config.privateKey) return 'Missing ALIPAY_PRIVATE_KEY in .env';
    if (!config.gateway) return 'Missing ALIPAY_GATEWAY in .env';
    return null;
}

function formatMoney(amount) {
    const num = Number(amount);
    if (!Number.isFinite(num)) return null;
    return num.toFixed(2);
}

function signParams(params, privateKey) {
    const keys = Object.keys(params)
        .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
        .sort();

    const signContent = keys.map((k) => `${k}=${params[k]}`).join('&');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signContent, 'utf8');
    return signer.sign(privateKey, 'base64');
}

// Build a signed GET gateway URL for browser redirect
function buildGatewayUrl(gateway, params, privateKey) {
    const sign = signParams(params, privateKey);
    const fullParams = { ...params, sign };
    const sp = new URLSearchParams();
    Object.keys(fullParams)
        .filter((k) => fullParams[k] !== undefined && fullParams[k] !== null && fullParams[k] !== '')
        .forEach((k) => sp.append(k, String(fullParams[k])));
    return `${gateway}?${sp.toString()}`;
}

// Call gateway with signed form body and parse JSON response
function postGateway(gateway, params, privateKey) {
    const sign = signParams(params, privateKey);
    const body = new URLSearchParams({ ...params, sign }).toString();
    const url = new URL(gateway);

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            (res) => {
                let raw = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => (raw += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(raw));
                    } catch (e) {
                        reject(new Error(`Invalid Alipay response: ${raw.slice(0, 200)}`));
                    }
                });
            }
        );

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function queryTrade(config, outTradeNo) {
    const params = {
        app_id: config.appId,
        method: 'alipay.trade.query',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: nowTimestamp(),
        version: '1.0',
        biz_content: JSON.stringify({ out_trade_no: outTradeNo })
    };
    return postGateway(config.gateway, params, config.privateKey);
}

// Create Alipay page-pay URL for an order
function buildOrderPayUrl(req, order, outTradeNoOverride) {
    const config = getConfig(req, order.id);
    const configError = assertConfig(config);
    if (configError) throw new Error(configError);

    const outTradeNo = outTradeNoOverride || `ORDER_${order.id}_${Date.now()}`;
    // Alipay payable amount is 5.5x of the order total (order total stays unchanged in DB)
    const payableAmount = Number(order.total) * 5.5;
    const payParams = {
        app_id: config.appId,
        method: 'alipay.trade.page.pay',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: nowTimestamp(),
        version: '1.0',
        return_url: config.returnUrl,
        biz_content: JSON.stringify({
            out_trade_no: outTradeNo,
            product_code: 'FAST_INSTANT_TRADE_PAY',
            total_amount: formatMoney(payableAmount),
            subject: `${config.subject} #${order.id}`
        })
    };

    const url = buildGatewayUrl(config.gateway, payParams, config.privateKey);
    return { outTradeNo, url };
}

// Query Alipay trade status for an order out_trade_no
async function queryOrderPaid(req, orderId, outTradeNo) {
    const config = getConfig(req, orderId);
    const configError = assertConfig(config);
    if (configError) return { ok: false, error: configError };

    try {
        const data = await queryTrade(config, outTradeNo);
        const resp = data && data.alipay_trade_query_response ? data.alipay_trade_query_response : null;
        const tradeStatus = resp ? resp.trade_status : null;
        const tradeNo = resp ? resp.trade_no : null;

        if (!resp || resp.code !== '10000') {
            const msg = resp ? `${resp.code || ''} ${resp.msg || ''}`.trim() : 'No response';
            return { ok: true, paid: false, tradeStatus: tradeStatus || null, error: `Alipay query failed: ${msg}` };
        }

        const paid = tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED';
        return { ok: true, paid, tradeStatus: tradeStatus || null, tradeNo: tradeNo || null };
    } catch (e) {
        return { ok: true, paid: false, error: e && e.message ? e.message : 'Failed to query Alipay' };
    }
}

module.exports = {
    buildOrderPayUrl,
    queryOrderPaid
};
