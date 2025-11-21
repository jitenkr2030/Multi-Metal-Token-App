// Fee Calculation Module for Multi-Metal Token App
// Implements: 1% spread on buy/sell, ₹50/month SIP fees, 0.1-0.5% swap fees

/**
 * Calculate fees for buy/sell transactions
 * @param {Object} params - Transaction parameters
 * @param {string} params.type - 'buy' or 'sell'
 * @param {string} params.asset - 'gold', 'silver', 'platinum', 'stablecoin'
 * @param {number} params.amount - Amount of asset
 * @param {number} params.marketPrice - Current market price
 * @param {Object} params.user - User object
 * @returns {Object} Fee breakdown
 */
function calculateFees({ type, asset, amount, marketPrice, user }) {
    const principalAmount = amount * marketPrice;
    
    // 1% spread fee on all buy/sell transactions
    const spreadFee = principalAmount * 0.01;
    
    // Platform fee (0.1% for buy, 0.1% for sell)
    const platformFeeRate = type === 'buy' ? 0.001 : 0.001;
    const platformFee = principalAmount * platformFeeRate;
    
    // GST on fees (18%)
    const totalFee = spreadFee + platformFee;
    const gst = totalFee * 0.18;
    
    return {
        spreadFee: Math.round(spreadFee * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        gst: Math.round(gst * 100) / 100,
        totalFee: Math.round((totalFee + gst) * 100) / 100,
        totalFeePercentage: ((spreadFee + platformFee + gst) / principalAmount) * 100
    };
}

/**
 * Calculate SIP fee based on frequency
 * @param {string} frequency - 'daily', 'weekly', 'monthly'
 * @returns {number} SIP fee amount
 */
function calculateSIPFee(frequency) {
    const baseMonthlyFee = 50; // ₹50 per month
    
    switch (frequency) {
        case 'daily':
            return baseMonthlyFee / 30; // Daily SIP fee
        case 'weekly':
            return baseMonthlyFee / 4; // Weekly SIP fee
        case 'monthly':
            return baseMonthlyFee; // Monthly SIP fee
        default:
            return baseMonthlyFee;
    }
}

/**
 * Calculate swap fees (0.1-0.5% based on amount)
 * @param {number} amount - Swap amount in INR
 * @returns {Object} Swap fee details
 */
function calculateSwapFee(amount) {
    let percentage;
    
    // Tiered fee structure based on amount
    if (amount >= 1000000) { // ₹10L+
        percentage = 0.001; // 0.1%
    } else if (amount >= 500000) { // ₹5L+
        percentage = 0.002; // 0.2%
    } else if (amount >= 100000) { // ₹1L+
        percentage = 0.003; // 0.3%
    } else if (amount >= 50000) { // ₹50K+
        percentage = 0.004; // 0.4%
    } else {
        percentage = 0.005; // 0.5%
    }
    
    const fee = amount * percentage;
    
    return {
        percentage,
        fee: Math.round(fee * 100) / 100,
        amount
    };
}

/**
 * Calculate spread between bid and ask prices
 * @param {number} marketPrice - Current market price
 * @param {number} spreadRate - Spread rate (default 0.01 for 1%)
 * @returns {Object} Bid and ask prices
 */
function calculateSpread(marketPrice, spreadRate = 0.01) {
    const bid = marketPrice * (1 - spreadRate);
    const ask = marketPrice * (1 + spreadRate);
    const mid = marketPrice;
    
    return {
        bid: Math.round(bid * 100) / 100,
        ask: Math.round(ask * 100) / 100,
        mid: Math.round(mid * 100) / 100,
        spread: Math.round((ask - bid) * 100) / 100,
        spreadPercentage: spreadRate * 100
    };
}

/**
 * Calculate redemption fees for physical delivery
 * @param {string} asset - Asset type
 * @param {number} amount - Amount in grams
 * @param {string} deliveryMethod - 'HOME', 'STORE', 'VAULT'
 * @returns {Object} Redemption fee breakdown
 */
function calculateRedemptionFees(asset, amount, deliveryMethod) {
    const marketPrices = {
        gold: 6000,
        silver: 75,
        platinum: 2800
    };
    
    const value = amount * (marketPrices[asset] || 1);
    
    // Delivery fees
    let deliveryFee;
    switch (deliveryMethod) {
        case 'HOME':
            deliveryFee = amount <= 10 ? 50 : amount <= 50 ? 100 : 200;
            break;
        case 'STORE':
            deliveryFee = 0;
            break;
        case 'VAULT':
            deliveryFee = 25;
            break;
        default:
            deliveryFee = 50;
    }
    
    // Insurance fee (0.5% of value)
    const insuranceFee = value * 0.005;
    
    // Processing fee (1% of value)
    const processingFee = value * 0.01;
    
    const totalFees = deliveryFee + insuranceFee + processingFee;
    
    return {
        deliveryFee,
        insuranceFee: Math.round(insuranceFee * 100) / 100,
        processingFee: Math.round(processingFee * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        netValue: value - totalFees
    };
}

/**
 * Calculate GST on transactions
 * @param {number} amount - Base amount
 * @param {number} gstRate - GST rate (default 0.18 for 18%)
 * @returns {number} GST amount
 */
function calculateGST(amount, gstRate = 0.18) {
    return Math.round(amount * gstRate * 100) / 100;
}

/**
 * Calculate profit/loss on investment
 * @param {number} investedAmount - Total amount invested
 * @param {number} currentValue - Current portfolio value
 * @returns {Object} P&L details
 */
function calculateProfitLoss(investedAmount, currentValue) {
    const profit = currentValue - investedAmount;
    const profitPercentage = investedAmount > 0 ? (profit / investedAmount) * 100 : 0;
    
    return {
        investedAmount,
        currentValue,
        profit: Math.round(profit * 100) / 100,
        profitPercentage: Math.round(profitPercentage * 100) / 100,
        isProfit: profit >= 0
    };
}

/**
 * Calculate portfolio diversification metrics
 * @param {Object} portfolio - User portfolio object
 * @returns {Object} Diversification metrics
 */
function calculateDiversification(portfolio) {
    const assets = ['gold', 'silver', 'platinum', 'stablecoin'];
    const totalValue = assets.reduce((sum, asset) => {
        return sum + (portfolio[asset]?.balance * portfolio[asset]?.currentPrice || 0);
    }, 0);
    
    if (totalValue === 0) {
        return {
            diversificationScore: 0,
            allocation: {},
            riskLevel: 'LOW'
        };
    }
    
    const allocation = {};
    const weights = [];
    
    assets.forEach(asset => {
        const value = portfolio[asset]?.balance * portfolio[asset]?.currentPrice || 0;
        const weight = (value / totalValue) * 100;
        allocation[asset] = {
            weight: Math.round(weight * 100) / 100,
            value: Math.round(value * 100) / 100
        };
        weights.push(weight);
    });
    
    // Calculate Herfindahl Index for diversification
    const hhi = weights.reduce((sum, weight) => sum + Math.pow(weight / 100, 2), 0);
    const diversificationScore = Math.round((1 - hhi) * 100);
    
    // Determine risk level based on concentration
    let riskLevel;
    if (diversificationScore >= 70) {
        riskLevel = 'LOW';
    } else if (diversificationScore >= 40) {
        riskLevel = 'MEDIUM';
    } else {
        riskLevel = 'HIGH';
    }
    
    return {
        diversificationScore,
        allocation,
        riskLevel,
        hhi: Math.round(hhi * 10000) / 10000
    };
}

/**
 * Calculate minimum order amounts
 * @param {string} asset - Asset type
 * @returns {Object} Minimum amounts
 */
function getMinimumAmounts(asset) {
    const minimums = {
        gold: { amount: 0.1, unit: 'gram', inr: 600 },
        silver: { amount: 1, unit: 'gram', inr: 75 },
        platinum: { amount: 0.1, unit: 'gram', inr: 280 },
        stablecoin: { amount: 100, unit: 'BINR', inr: 100 }
    };
    
    return minimums[asset] || minimums.gold;
}

/**
 * Calculate maximum order amounts based on user limits
 * @param {string} asset - Asset type
 * @param {Object} user - User object
 * @returns {Object} Maximum amounts
 */
function getMaximumAmounts(asset, user) {
    const baseMaximums = {
        gold: { amount: 1000, unit: 'gram', inr: 6000000 },
        silver: { amount: 50000, unit: 'gram', inr: 3750000 },
        platinum: { amount: 1000, unit: 'gram', inr: 2800000 },
        stablecoin: { amount: 10000000, unit: 'BINR', inr: 10000000 }
    };
    
    const baseMax = baseMaximums[asset];
    
    // Apply user level limits
    const levelMultipliers = {
        1: 0.1,  // Basic - 10% of base
        2: 0.5,  // Verified - 50% of base
        3: 1.0,  // Premium - 100% of base
        4: 2.0   // VIP - 200% of base
    };
    
    const multiplier = levelMultipliers[user.kycLevel] || 0.1;
    
    return {
        amount: baseMax.amount * multiplier,
        unit: baseMax.unit,
        inr: baseMax.inr * multiplier
    };
}

/**
 * Format fee amounts for display
 * @param {number} amount - Fee amount
 * @param {string} currency - Currency code
 * @returns {string} Formatted fee
 */
function formatFee(amount, currency = 'INR') {
    return `${currency === 'INR' ? '₹' : '$'}${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/**
 * Calculate annual fee projections
 * @param {Array} sipPlans - User's SIP plans
 * @returns {Object} Annual fee projections
 */
function calculateAnnualFees(sipPlans) {
    const monthlySIPFees = sipPlans.reduce((sum, plan) => sum + plan.sipFee, 0);
    const annualSIPFees = monthlySIPFees * 12;
    
    const projectedTradingFees = {
        buy: 0,
        sell: 0,
        swap: 0
    };
    
    // Project trading fees based on SIP amounts
    sipPlans.forEach(plan => {
        const monthlyAmount = plan.amount;
        const annualAmount = monthlyAmount * 12;
        
        // Assume 1% spread on all trades
        projectedTradingFees.buy += annualAmount * 0.01;
        projectedTradingFees.sell += annualAmount * 0.01;
    });
    
    const totalAnnualFees = annualSIPFees + 
        projectedTradingFees.buy + 
        projectedTradingFees.sell + 
        projectedTradingFees.swap;
    
    return {
        annualSIPFees: Math.round(annualSIPFees * 100) / 100,
        projectedTradingFees: {
            buy: Math.round(projectedTradingFees.buy * 100) / 100,
            sell: Math.round(projectedTradingFees.sell * 100) / 100,
            swap: Math.round(projectedTradingFees.swap * 100) / 100
        },
        totalAnnualFees: Math.round(totalAnnualFees * 100) / 100
    };
}

module.exports = {
    calculateFees,
    calculateSIPFee,
    calculateSwapFee,
    calculateSpread,
    calculateRedemptionFees,
    calculateGST,
    calculateProfitLoss,
    calculateDiversification,
    getMinimumAmounts,
    getMaximumAmounts,
    formatFee,
    calculateAnnualFees
};