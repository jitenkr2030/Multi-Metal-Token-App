// India's First Multi-Metal Token App Backend
// Unified trading platform for Gold + Silver + Platinum + Stablecoin

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Gateway, Wallets } = require('fabric-network');
const { hashPassword, verifyPassword, generateToken, authenticateJWT } = require('./auth');
const { createPaymentIntent, verifyPayment } = require('./payments');
const { calculateFees, calculateSpread, calculateSIPFee, calculateSwapFee } = require('./fees');
const { getMarketRates } = require('./market-rates');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Initialize services
const paymentService = createPaymentIntent();

// ==================== USER AUTHENTICATION ====================

// User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, phone, password, referralCode } = req.body;
        
        // Validate input
        if (!email || !phone || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user exists
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user with multi-asset portfolio
        const user = {
            userId: generateUserId(),
            email,
            phone,
            passwordHash: hashedPassword,
            referralCode: referralCode || generateReferralCode(),
            kycLevel: 1,
            status: 'ACTIVE',
            createdAt: new Date(),
            portfolio: {
                gold: { balance: 0, totalInvested: 0, tokens: [] },
                silver: { balance: 0, totalInvested: 0, tokens: [] },
                platinum: { balance: 0, totalInvested: 0, tokens: [] },
                stablecoin: { balance: 0, totalInvested: 0 }, // BINR
                inrBalance: 0,
                sipPlans: [],
                totalValue: 0,
                totalProfit: 0
            },
            transactions: [],
            sipFees: { lastPaid: null, totalPaid: 0 }
        };

        // Save to database
        await saveUser(user);

        res.json({
            message: 'User registered successfully',
            userId: user.userId,
            referralCode: user.referralCode
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, otp } = req.body;
        
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken({ userId: user.userId, email: user.email });

        res.json({
            message: 'Login successful',
            token,
            user: {
                userId: user.userId,
                email: user.email,
                phone: user.phone,
                kycLevel: user.kycLevel,
                portfolio: user.portfolio
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ==================== MARKET DATA ====================

// Get current market rates for all assets
app.get('/api/market/rates', async (req, res) => {
    try {
        const rates = await getMarketRates();
        
        res.json({
            timestamp: new Date(),
            assets: {
                gold: {
                    price: rates.gold.price,
                    unit: 'gram',
                    change: rates.gold.change,
                    changePercent: rates.gold.changePercent,
                    bid: rates.gold.price * (1 - 0.01), // 1% spread
                    ask: rates.gold.price * (1 + 0.01)
                },
                silver: {
                    price: rates.silver.price,
                    unit: 'gram',
                    change: rates.silver.change,
                    changePercent: rates.silver.changePercent,
                    bid: rates.silver.price * (1 - 0.01),
                    ask: rates.silver.price * (1 + 0.01)
                },
                platinum: {
                    price: rates.platinum.price,
                    unit: 'gram',
                    change: rates.platinum.change,
                    changePercent: rates.platinum.changePercent,
                    bid: rates.platinum.price * (1 - 0.01),
                    ask: rates.platinum.price * (1 + 0.01)
                },
                stablecoin: {
                    price: 1.0, // 1 BINR = 1 INR
                    unit: 'BINR',
                    change: 0,
                    changePercent: 0,
                    bid: 0.99,
                    ask: 1.01
                }
            },
            spread: 0.01, // 1% spread applied
            lastUpdated: new Date()
        });

    } catch (error) {
        console.error('Market rates error:', error);
        res.status(500).json({ error: 'Failed to fetch market rates' });
    }
});

// ==================== ASSET TRADING ====================

// Buy Asset (Gold, Silver, Platinum, or Stablecoin)
app.post('/api/trade/buy', authenticateJWT, async (req, res) => {
    try {
        const { userId } = req.user;
        const { asset, amount, paymentMethod, upiId } = req.body;

        // Validate asset
        if (!['gold', 'silver', 'platinum', 'stablecoin'].includes(asset)) {
            return res.status(400).json({ error: 'Invalid asset type' });
        }

        // Get current market rate
        const rates = await getMarketRates();
        const marketPrice = rates[asset].price;
        
        // Calculate fees
        const fees = calculateFees({
            type: 'buy',
            asset,
            amount,
            marketPrice,
            user
        });

        const totalCost = (amount * marketPrice) + fees.totalFee;

        // Create transaction record
        const transaction = {
            transactionId: generateTransactionId(),
            userId,
            type: 'BUY',
            asset,
            amount,
            price: marketPrice,
            totalCost,
            fees,
            status: 'PENDING',
            createdAt: new Date()
        };

        // Save transaction
        await saveTransaction(transaction);

        // Create payment intent
        const payment = await paymentService.createPayment({
            amount: totalCost,
            currency: 'INR',
            method: paymentMethod,
            upiId,
            userId
        });

        res.json({
            message: 'Buy order created',
            transactionId: transaction.transactionId,
            paymentId: payment.paymentId,
            amount,
            price: marketPrice,
            totalCost,
            fees,
            breakdown: {
                principalAmount: amount * marketPrice,
                spreadFee: fees.spreadFee,
                platformFee: fees.platformFee,
                gst: fees.gst
            }
        });

    } catch (error) {
        console.error('Buy order error:', error);
        res.status(500).json({ error: 'Buy order failed' });
    }
});

// Sell Asset
app.post('/api/trade/sell', authenticateJWT, async (req, res) => {
    try {
        const { userId } = req.user;
        const { asset, amount, bankAccount } = req.body;

        // Validate asset
        if (!['gold', 'silver', 'platinum', 'stablecoin'].includes(asset)) {
            return res.status(400).json({ error: 'Invalid asset type' });
        }

        // Check user balance
        const user = await findUserById(userId);
        const userBalance = user.portfolio[asset].balance;

        if (userBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Get current market rate
        const rates = await getMarketRates();
        const marketPrice = rates[asset].price;
        
        // Calculate fees
        const fees = calculateFees({
            type: 'sell',
            asset,
            amount,
            marketPrice,
            user
        });

        const netAmount = (amount * marketPrice) - fees.totalFee;

        // Create transaction record
        const transaction = {
            transactionId: generateTransactionId(),
            userId,
            type: 'SELL',
            asset,
            amount,
            price: marketPrice,
            netAmount,
            fees,
            status: 'PROCESSING',
            createdAt: new Date()
        };

        // Save transaction
        await saveTransaction(transaction);

        // Update user portfolio
        user.portfolio[asset].balance -= amount;
        await saveUser(user);

        res.json({
            message: 'Sell order processed',
            transactionId: transaction.transactionId,
            amount,
            price: marketPrice,
            netAmount,
            fees,
            breakdown: {
                grossAmount: amount * marketPrice,
                spreadFee: fees.spreadFee,
                platformFee: fees.platformFee,
                gst: fees.gst,
                netAmount
            }
        });

    } catch (error) {
        console.error('Sell order error:', error);
        res.status(500).json({ error: 'Sell order failed' });
    }
});

// Swap between assets
app.post('/api/trade/swap', authenticateJWT, async (req, res) => {
    try {
        const { userId } = req.user;
        const { fromAsset, toAsset, amount } = req.body;

        // Validate assets
        if (!['gold', 'silver', 'platinum', 'stablecoin'].includes(fromAsset) ||
            !['gold', 'silver', 'platinum', 'stablecoin'].includes(toAsset)) {
            return res.status(400).json({ error: 'Invalid asset type' });
        }

        if (fromAsset === toAsset) {
            return res.status(400).json({ error: 'Cannot swap same asset' });
        }

        // Check user balance
        const user = await findUserById(userId);
        const userBalance = user.portfolio[fromAsset].balance;

        if (userBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Get current market rates
        const rates = await getMarketRates();
        const fromPrice = rates[fromAsset].price;
        const toPrice = rates[toAsset].price;
        
        // Calculate swap
        const fromValue = amount * fromPrice;
        const receivedAmount = fromValue / toPrice;
        
        // Calculate swap fees (0.1-0.5%)
        const swapFees = calculateSwapFee(fromValue);
        
        const finalAmount = receivedAmount - (receivedAmount * swapFees.percentage);
        const finalFee = receivedAmount * swapFees.percentage;

        // Create transaction records for both assets
        const sellTransaction = {
            transactionId: generateTransactionId(),
            userId,
            type: 'SWAP_SELL',
            asset: fromAsset,
            amount,
            price: fromPrice,
            fees: { swapFee: finalFee },
            status: 'COMPLETED',
            createdAt: new Date()
        };

        const buyTransaction = {
            transactionId: generateTransactionId(),
            userId,
            type: 'SWAP_BUY',
            asset: toAsset,
            amount: finalAmount,
            price: toPrice,
            fees: { swapFee: finalFee },
            status: 'COMPLETED',
            createdAt: new Date()
        };

        // Update user portfolio
        user.portfolio[fromAsset].balance -= amount;
        user.portfolio[toAsset].balance += finalAmount;
        await saveUser(user);

        // Save transactions
        await saveTransaction(sellTransaction);
        await saveTransaction(buyTransaction);

        res.json({
            message: 'Swap completed',
            swapRate: toPrice / fromPrice,
            fromAsset: {
                amount,
                price: fromPrice,
                value: fromValue
            },
            toAsset: {
                amount: finalAmount,
                price: toPrice,
                value: finalAmount * toPrice
            },
            fees: {
                swapFee: finalFee,
                swapPercentage: swapFees.percentage * 100
            },
            transactions: [sellTransaction, buyTransaction]
        });

    } catch (error) {
        console.error('Swap error:', error);
        res.status(500).json({ error: 'Swap failed' });
    }
});

// ==================== SIP MANAGEMENT ====================

// Create SIP Plan
app.post('/api/sip/create', authenticateJWT, async (req, res) => {
    try {
        const { userId } = req.user;
        const { asset, amount, frequency, startDate } = req.body;

        // Validate asset
        if (!['gold', 'silver', 'platinum', 'stablecoin'].includes(asset)) {
            return res.status(400).json({ error: 'Invalid asset type' });
        }

        // Calculate SIP fee (₹50/month)
        const sipFee = calculateSIPFee(frequency);

        // Create SIP plan
        const sipPlan = {
            sipId: generateSIPId(),
            userId,
            asset,
            amount,
            frequency, // daily, weekly, monthly
            sipFee,
            startDate: new Date(startDate),
            status: 'ACTIVE',
            createdAt: new Date(),
            totalInvested: 0,
            transactions: []
        };

        // Save SIP plan
        await saveSIPPlan(sipPlan);

        // Update user's portfolio
        const user = await findUserById(userId);
        user.portfolio.sipPlans.push(sipPlan);
        await saveUser(user);

        res.json({
            message: 'SIP created successfully',
            sipId: sipPlan.sipId,
            sipFee,
            nextPurchaseDate: calculateNextPurchaseDate(sipPlan),
            estimatedAnnualFee: sipFee * 12
        });

    } catch (error) {
        console.error('SIP creation error:', error);
        res.status(500).json({ error: 'SIP creation failed' });
    }
});

// Get user's SIP plans
app.get('/api/sip/plans', authenticateJWT, async (req, res) => {
    try {
        const { userId } = req.user;
        
        const sipPlans = await getSIPPlansByUser(userId);
        
        res.json({
            plans: sipPlans,
            totalSIPs: sipPlans.length,
            totalMonthlyInvestment: sipPlans.reduce((sum, plan) => {
                return sum + (plan.frequency === 'monthly' ? plan.amount : 0);
            }, 0),
            totalMonthlyFees: sipPlans.reduce((sum, plan) => {
                return sum + plan.sipFee;
            }, 0)
        });

    } catch (error) {
        console.error('SIP plans error:', error);
        res.status(500).json({ error: 'Failed to fetch SIP plans' });
    }
});

// ==================== PORTFOLIO MANAGEMENT ====================

// Get user portfolio
app.get('/api/portfolio', authenticateJWT, async (req, res) => {
    try {
        const { userId } = req.user;
        
        const user = await findUserById(userId);
        const rates = await getMarketRates();
        
        // Calculate current portfolio values
        const portfolio = {
            ...user.portfolio,
            assets: {},
            totalValue: 0,
            totalInvested: 0,
            totalProfit: 0,
            allocation: {}
        };

        // Calculate asset values
        for (const asset of ['gold', 'silver', 'platinum', 'stablecoin']) {
            const balance = user.portfolio[asset].balance;
            const currentPrice = rates[asset].price;
            const currentValue = balance * currentPrice;
            const investedValue = user.portfolio[asset].totalInvested;
            const profit = currentValue - investedValue;
            const profitPercent = investedValue > 0 ? (profit / investedValue) * 100 : 0;

            portfolio.assets[asset] = {
                balance,
                currentPrice,
                currentValue,
                investedValue,
                profit,
                profitPercent,
                allocation: 0 // Will calculate after total value
            };

            portfolio.totalValue += currentValue;
            portfolio.totalInvested += investedValue;
        }

        // Calculate allocations
        if (portfolio.totalValue > 0) {
            for (const asset of ['gold', 'silver', 'platinum', 'stablecoin']) {
                portfolio.assets[asset].allocation = 
                    (portfolio.assets[asset].currentValue / portfolio.totalValue) * 100;
            }
        }

        portfolio.totalProfit = portfolio.totalValue - portfolio.totalInvested;
        portfolio.totalProfitPercent = portfolio.totalInvested > 0 ? 
            (portfolio.totalProfit / portfolio.totalInvested) * 100 : 0;

        res.json({
            portfolio,
            marketRates: rates,
            lastUpdated: new Date(),
            performance: {
                dayChange: 0, // Calculate from historical data
                weekChange: 0,
                monthChange: 0,
                yearChange: 0
            }
        });

    } catch (error) {
        console.error('Portfolio error:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

// Get transaction history
app.get('/api/transactions', authenticateJWT, async (req, res) => {
    try {
        const { userId } = req.user;
        const { page = 1, limit = 50, asset, type } = req.query;
        
        const transactions = await getUserTransactions(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            asset,
            type
        });

        res.json({
            transactions: transactions.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: transactions.total,
                totalPages: Math.ceil(transactions.total / limit)
            }
        });

    } catch (error) {
        console.error('Transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ==================== UTILITY FUNCTIONS ====================

function generateUserId() {
    return 'USER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateTransactionId() {
    return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateSIPId() {
    return 'SIP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateReferralCode() {
    return 'MM' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function calculateNextPurchaseDate(sipPlan) {
    const now = new Date();
    const nextDate = new Date(now);
    
    switch (sipPlan.frequency) {
        case 'daily':
            nextDate.setDate(now.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(now.getDate() + 7);
            break;
        case 'monthly':
            nextDate.setMonth(now.getMonth() + 1);
            break;
    }
    
    return nextDate;
}

// ==================== DATABASE OPERATIONS ====================

async function findUserByEmail(email) {
    // Implementation for finding user by email
    return null; // Placeholder
}

async function findUserById(userId) {
    // Implementation for finding user by ID
    return null; // Placeholder
}

async function saveUser(user) {
    // Implementation for saving user
    return true; // Placeholder
}

async function saveTransaction(transaction) {
    // Implementation for saving transaction
    return true; // Placeholder
}

async function saveSIPPlan(sipPlan) {
    // Implementation for saving SIP plan
    return true; // Placeholder
}

async function getSIPPlansByUser(userId) {
    // Implementation for getting SIP plans
    return []; // Placeholder
}

async function getUserTransactions(userId, options) {
    // Implementation for getting user transactions
    return { data: [], total: 0 }; // Placeholder
}

// ==================== SERVER START ====================

app.listen(PORT, () => {
    console.log(`🚀 Multi-Metal Token App API Server running on port ${PORT}`);
    console.log(`🥇 Gold Token Trading: Enabled`);
    console.log(`🥈 Silver Token Trading: Enabled`);
    console.log(`🥉 Platinum Token Trading: Enabled`);
    console.log(`💰 Stablecoin (BINR) Trading: Enabled`);
    console.log(`📊 Fee Structure: 1% spread, ₹50/month SIP, 0.1-0.5% swap`);
});

module.exports = app;