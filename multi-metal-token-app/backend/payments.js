// Payments Module for Multi-Metal Token App
// Handles UPI, Bank Transfers, and Payment Processing

/**
 * Create UPI Payment Intent
 * @param {Object} params - Payment parameters
 * @returns {Promise<Object>} Payment intent details
 */
async function createUPIIntent(params) {
    const { amount, currency, upiId, userId, description } = params;
    
    // Generate unique payment ID
    const paymentId = generatePaymentId();
    
    // Create UPI payment request
    const upiPayment = {
        paymentId,
        userId,
        method: 'UPI',
        amount,
        currency: currency || 'INR',
        upiId,
        description: description || 'Multi-Metal Token Purchase',
        status: 'INITIATED',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiry
        qrCode: generateUPICode(upiId, amount, paymentId),
        upiLink: generateUPILink(upiId, amount, paymentId)
    };
    
    // Save payment to database
    await savePayment(upiPayment);
    
    return {
        paymentId,
        status: 'INITIATED',
        amount,
        currency,
        upiId,
        qrCode: upiPayment.qrCode,
        upiLink: upiPayment.upiLink,
        expiresAt: upiPayment.expiresAt,
        instructions: [
            'Open your UPI app (PhonePe, Google Pay, Paytm, etc.)',
            'Scan the QR code or click the UPI link',
            'Complete the payment within 15 minutes',
            'Payment will be credited automatically'
        ]
    };
}

/**
 * Verify UPI Payment Status
 * @param {string} paymentId - Payment ID
 * @param {string} transactionId - UPI transaction ID
 * @returns {Promise<Object>} Payment verification result
 */
async function verifyUPIPayment(paymentId, transactionId) {
    try {
        // Get payment details
        const payment = await getPaymentById(paymentId);
        
        if (!payment) {
            throw new Error('Payment not found');
        }
        
        if (payment.status === 'COMPLETED') {
            return {
                status: 'ALREADY_COMPLETED',
                paymentId,
                transactionId: payment.transactionId,
                amount: payment.amount,
                completedAt: payment.completedAt
            };
        }
        
        if (payment.expiresAt < new Date()) {
            await updatePaymentStatus(paymentId, 'EXPIRED');
            return {
                status: 'EXPIRED',
                paymentId,
                message: 'Payment has expired'
            };
        }
        
        // In production, verify with UPI provider (PhonePe, Google Pay, etc.)
        // For now, simulate verification based on transaction ID
        const isValid = validateTransactionId(transactionId);
        
        if (isValid) {
            await updatePaymentStatus(paymentId, 'COMPLETED', {
                transactionId,
                completedAt: new Date(),
                gateway: 'UPI'
            });
            
            return {
                status: 'COMPLETED',
                paymentId,
                transactionId,
                amount: payment.amount,
                completedAt: new Date(),
                message: 'Payment verified successfully'
            };
        } else {
            await updatePaymentStatus(paymentId, 'FAILED', {
                failedAt: new Date(),
                failureReason: 'Invalid transaction ID'
            });
            
            return {
                status: 'FAILED',
                paymentId,
                message: 'Payment verification failed'
            };
        }
    } catch (error) {
        console.error('UPI payment verification error:', error);
        throw new Error('Payment verification failed');
    }
}

/**
 * Create Bank Transfer Payment
 * @param {Object} params - Bank transfer parameters
 * @returns {Promise<Object>} Bank transfer details
 */
async function createBankTransfer(params) {
    const { amount, currency, userId, bankAccount, description } = params;
    
    const paymentId = generatePaymentId();
    
    // Generate bank transfer details
    const bankDetails = generateBankDetails(amount, paymentId);
    
    const bankTransfer = {
        paymentId,
        userId,
        method: 'BANK_TRANSFER',
        amount,
        currency: currency || 'INR',
        bankDetails,
        description: description || 'Multi-Metal Token Purchase',
        status: 'PENDING_CONFIRMATION',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        referenceNumber: bankDetails.referenceNumber
    };
    
    await savePayment(bankTransfer);
    
    return {
        paymentId,
        status: 'PENDING_CONFIRMATION',
        amount,
        bankDetails: {
            accountName: bankDetails.accountName,
            accountNumber: bankDetails.accountNumber,
            ifscCode: bankDetails.ifscCode,
            bankName: bankDetails.bankName,
            referenceNumber: bankDetails.referenceNumber
        },
        instructions: [
            'Transfer the exact amount to the provided bank account',
            'Use the reference number as UTR/Narration',
            'Payment will be credited within 1-2 business hours',
            'Keep the transaction receipt for verification'
        ],
        expiresAt: bankTransfer.expiresAt
    };
}

/**
 * Create Credit/Debit Card Payment
 * @param {Object} params - Card payment parameters
 * @returns {Promise<Object>} Card payment intent
 */
async function createCardPayment(params) {
    const { amount, currency, userId, cardToken, description } = params;
    
    const paymentId = generatePaymentId();
    
    // In production, integrate with Razorpay, Stripe, or PayU
    const cardPayment = {
        paymentId,
        userId,
        method: 'CARD',
        amount,
        currency: currency || 'INR',
        cardToken, // Tokenized card information
        status: 'INITIATED',
        createdAt: new Date(),
        description: description || 'Multi-Metal Token Purchase'
    };
    
    await savePayment(cardPayment);
    
    return {
        paymentId,
        status: 'INITIATED',
        amount,
        clientSecret: generateClientSecret(paymentId), // For 3D Secure
        nextAction: 'COMPLETE_3D_SECURE'
    };
}

/**
 * Process Net Banking Payment
 * @param {Object} params - Net banking parameters
 * @returns {Promise<Object>} Net banking payment details
 */
async function createNetBankingPayment(params) {
    const { amount, currency, userId, bankCode, description } = params;
    
    const paymentId = generatePaymentId();
    
    const netBankingPayment = {
        paymentId,
        userId,
        method: 'NET_BANKING',
        amount,
        currency: currency || 'INR',
        bankCode,
        status: 'REDIRECT_REQUIRED',
        createdAt: new Date(),
        redirectUrl: generateNetBankingUrl(paymentId, bankCode),
        description: description || 'Multi-Metal Token Purchase'
    };
    
    await savePayment(netBankingPayment);
    
    return {
        paymentId,
        status: 'REDIRECT_REQUIRED',
        amount,
        redirectUrl: netBankingPayment.redirectUrl,
        bankCode
    };
}

/**
 * Get Payment Status
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} Payment status
 */
async function getPaymentStatus(paymentId) {
    const payment = await getPaymentById(paymentId);
    
    if (!payment) {
        throw new Error('Payment not found');
    }
    
    return {
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt || null,
        expiresAt: payment.expiresAt || null
    };
}

/**
 * Process Refund
 * @param {Object} params - Refund parameters
 * @returns {Promise<Object>} Refund details
 */
async function processRefund(params) {
    const { originalPaymentId, amount, reason, userId } = params;
    
    // Verify original payment exists and is completed
    const originalPayment = await getPaymentById(originalPaymentId);
    
    if (!originalPayment || originalPayment.status !== 'COMPLETED') {
        throw new Error('Invalid or incomplete original payment');
    }
    
    if (originalPayment.amount < amount) {
        throw new Error('Refund amount exceeds original payment');
    }
    
    const refundId = generateRefundId();
    
    const refund = {
        refundId,
        originalPaymentId,
        amount,
        reason,
        userId,
        status: 'PROCESSING',
        createdAt: new Date(),
        processedAt: null
    };
    
    await saveRefund(refund);
    
    // Process refund based on payment method
    let refundResult;
    switch (originalPayment.method) {
        case 'UPI':
            refundResult = await processUPIPRefund(originalPayment, amount);
            break;
        case 'BANK_TRANSFER':
            refundResult = await processBankRefund(originalPayment, amount);
            break;
        case 'CARD':
            refundResult = await processCardRefund(originalPayment, amount);
            break;
        case 'NET_BANKING':
            refundResult = await processNetBankingRefund(originalPayment, amount);
            break;
        default:
            throw new Error('Unsupported payment method for refund');
    }
    
    await updateRefundStatus(refundId, 'COMPLETED', {
        processedAt: new Date(),
        refundReference: refundResult.reference
    });
    
    return {
        refundId,
        status: 'COMPLETED',
        amount,
        originalPaymentId,
        processedAt: new Date(),
        refundReference: refundResult.reference
    };
}

/**
 * Get Payment History
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Payment history
 */
async function getPaymentHistory(userId, options = {}) {
    const { page = 1, limit = 50, status, method } = options;
    
    const payments = await getPaymentsByUser(userId, {
        page,
        limit,
        status,
        method
    });
    
    return {
        payments: payments.data,
        pagination: {
            page,
            limit,
            total: payments.total,
            totalPages: Math.ceil(payments.total / limit)
        }
    };
}

/**
 * Calculate Payment Fees
 * @param {string} method - Payment method
 * @param {number} amount - Payment amount
 * @returns {Object} Fee breakdown
 */
function calculatePaymentFees(method, amount) {
    const feeStructure = {
        UPI: {
            fee: Math.min(amount * 0.009, 9), // 0.9% or ₹9 max
            gst: 0
        },
        BANK_TRANSFER: {
            fee: 5, // Fixed ₹5 fee
            gst: 0.9 // 18% GST on fee
        },
        CARD: {
            fee: amount * 0.019, // 1.9% fee
            gst: amount * 0.019 * 0.18 // 18% GST on fee
        },
        NET_BANKING: {
            fee: amount * 0.015, // 1.5% fee
            gst: amount * 0.015 * 0.18 // 18% GST on fee
        }
    };
    
    const fees = feeStructure[method] || feeStructure.UPI;
    
    return {
        paymentMethod: method,
        amount,
        processingFee: Math.round(fees.fee * 100) / 100,
        gst: Math.round(fees.gst * 100) / 100,
        totalFees: Math.round((fees.fee + fees.gst) * 100) / 100,
        netAmount: Math.round((amount - fees.fee - fees.gst) * 100) / 100
    };
}

/**
 * Generate UPI QR Code data
 * @param {string} upiId - UPI ID
 * @param {number} amount - Amount
 * @param {string} paymentId - Payment ID
 * @returns {string} UPI QR code data
 */
function generateUPICode(upiId, amount, paymentId) {
    // Format: upi://pay?pa=<upi-id>&pn=<name>&am=<amount>&cu=<currency>&tr=<transaction-id>
    const upiData = `upi://pay?pa=${upiId}&pn=MultiMetalToken&am=${amount}&cu=INR&tr=${paymentId}&tn=Token%20Purchase`;
    return upiData;
}

/**
 * Generate UPI deep link
 * @param {string} upiId - UPI ID
 * @param {number} amount - Amount
 * @param {string} paymentId - Payment ID
 * @returns {string} UPI deep link
 */
function generateUPILink(upiId, amount, paymentId) {
    return `upi://pay?pa=${upiId}&pn=MultiMetalToken&am=${amount}&cu=INR&tr=${paymentId}&tn=Token%20Purchase`;
}

/**
 * Generate bank transfer details
 * @param {number} amount - Amount
 * @param {string} paymentId - Payment ID
 * @returns {Object} Bank details
 */
function generateBankDetails(amount, paymentId) {
    return {
        accountName: 'MULTI METAL TOKEN PVT LTD',
        accountNumber: '12345678901234',
        ifscCode: 'MMTB0000001',
        bankName: 'Multi Metal Token Bank',
        referenceNumber: `MMT${paymentId.slice(-6)}`,
        note: `Use reference ${paymentId.slice(-6)} as UTR/Narration`
    };
}

/**
 * Validate UPI transaction ID
 * @param {string} transactionId - UPI transaction ID
 * @returns {boolean} Validation result
 */
function validateTransactionId(transactionId) {
    // UPI transaction IDs typically follow specific patterns
    const upiPattern = /^[A-Z0-9]{12,20}$/;
    return upiPattern.test(transactionId);
}

/**
 * Generate unique payment ID
 * @returns {string} Payment ID
 */
function generatePaymentId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `PAY_${timestamp}_${random}`.toUpperCase();
}

/**
 * Generate refund ID
 * @returns {string} Refund ID
 */
function generateRefundId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `REF_${timestamp}_${random}`.toUpperCase();
}

/**
 * Generate client secret for card payments
 * @param {string} paymentId - Payment ID
 * @returns {string} Client secret
 */
function generateClientSecret(paymentId) {
    return Buffer.from(`${paymentId}_${Date.now()}`).toString('base64');
}

/**
 * Generate net banking redirect URL
 * @param {string} paymentId - Payment ID
 * @param {string} bankCode - Bank code
 * @returns {string} Redirect URL
 */
function generateNetBankingUrl(paymentId, bankCode) {
    return `https://netbanking.multimetaltoken.com/redirect?pid=${paymentId}&bank=${bankCode}`;
}

// ==================== STUB IMPLEMENTATIONS ====================
// These functions would be implemented with actual database operations

async function savePayment(payment) {
    // Stub implementation
    return true;
}

async function getPaymentById(paymentId) {
    // Stub implementation
    return null;
}

async function updatePaymentStatus(paymentId, status, details = {}) {
    // Stub implementation
    return true;
}

async function saveRefund(refund) {
    // Stub implementation
    return true;
}

async function updateRefundStatus(refundId, status, details = {}) {
    // Stub implementation
    return true;
}

async function getPaymentsByUser(userId, options) {
    // Stub implementation
    return { data: [], total: 0 };
}

async function processUPIPRefund(payment, amount) {
    return { reference: `UPI_REF_${Date.now()}` };
}

async function processBankRefund(payment, amount) {
    return { reference: `BANK_REF_${Date.now()}` };
}

async function processCardRefund(payment, amount) {
    return { reference: `CARD_REF_${Date.now()}` };
}

async function processNetBankingRefund(payment, amount) {
    return { reference: `NB_REF_${Date.now()}` };
}

// ==================== EXPORTS ====================

function createPaymentIntent() {
    return {
        createUPIIntent,
        createBankTransfer,
        createCardPayment,
        createNetBankingPayment,
        verifyUPIPayment,
        getPaymentStatus,
        processRefund,
        getPaymentHistory,
        calculatePaymentFees
    };
}

module.exports = {
    createUPIIntent,
    verifyUPIPayment,
    createBankTransfer,
    createCardPayment,
    createNetBankingPayment,
    getPaymentStatus,
    processRefund,
    getPaymentHistory,
    calculatePaymentFees,
    createPaymentIntent
};