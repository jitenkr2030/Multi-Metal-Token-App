// Market Rates Service for Multi-Metal Token App
// Provides real-time pricing for Gold, Silver, Platinum, and Stablecoin

/**
 * Get current market rates for all assets
 * @returns {Object} Current market rates
 */
async function getMarketRates() {
    try {
        // In production, this would fetch from actual APIs
        // For now, we'll simulate realistic market data with some variation
        
        const baseRates = {
            gold: {
                price: 6025.50, // ₹ per gram
                unit: 'gram',
                currency: 'INR',
                exchange: 'MCX',
                lastUpdate: new Date(),
                change: 0,
                changePercent: 0
            },
            silver: {
                price: 76.80, // ₹ per gram
                unit: 'gram',
                currency: 'INR',
                exchange: 'MCX',
                lastUpdate: new Date(),
                change: 0,
                changePercent: 0
            },
            platinum: {
                price: 2825.30, // ₹ per gram
                unit: 'gram',
                currency: 'INR',
                exchange: 'LPPM',
                lastUpdate: new Date(),
                change: 0,
                changePercent: 0
            },
            stablecoin: {
                price: 1.0, // 1 BINR = 1 INR
                unit: 'BINR',
                currency: 'INR',
                exchange: 'INTERNAL',
                lastUpdate: new Date(),
                change: 0,
                changePercent: 0
            }
        };

        // Add realistic market movement simulation
        const ratesWithMovement = await applyMarketMovement(baseRates);
        
        return ratesWithMovement;
        
    } catch (error) {
        console.error('Error fetching market rates:', error);
        // Return fallback rates
        return getFallbackRates();
    }
}

/**
 * Apply market movement simulation (replace with real API calls in production)
 * @param {Object} baseRates - Base market rates
 * @returns {Object} Rates with market movement
 */
async function applyMarketMovement(baseRates) {
    // Simulate market volatility
    const volatility = {
        gold: 0.002, // 0.2% max movement
        silver: 0.005, // 0.5% max movement
        platinum: 0.003, // 0.3% max movement
        stablecoin: 0.0001 // 0.01% max movement (pegged)
    };

    const movement = {};
    
    for (const [asset, data] of Object.entries(baseRates)) {
        const changePercent = (Math.random() - 0.5) * 2 * volatility[asset];
        const changeAmount = data.price * changePercent;
        const newPrice = data.price + changeAmount;
        
        movement[asset] = {
            ...data,
            price: Math.round(newPrice * 100) / 100,
            change: Math.round(changeAmount * 100) / 100,
            changePercent: Math.round(changePercent * 10000) / 100, // Keep as percentage
            bid: Math.round(newPrice * (1 - 0.01) * 100) / 100, // 1% spread
            ask: Math.round(newPrice * (1 + 0.01) * 100) / 100,
            lastUpdate: new Date(),
            source: 'SIMULATED' // In production: 'MCX', 'LPPM', etc.
        };
    }
    
    return movement;
}

/**
 * Get historical price data for charting
 * @param {string} asset - Asset type
 * @param {string} period - '1D', '1W', '1M', '3M', '1Y'
 * @returns {Array} Historical price data
 */
async function getHistoricalPrices(asset, period = '1M') {
    const basePrice = {
        gold: 6025.50,
        silver: 76.80,
        platinum: 2825.30,
        stablecoin: 1.0
    };

    const dataPoints = getDataPointsForPeriod(period);
    const volatility = {
        gold: 0.02,
        silver: 0.03,
        platinum: 0.025,
        stablecoin: 0.0001
    };

    const historicalData = [];
    const startDate = getStartDateForPeriod(period);
    
    for (let i = 0; i < dataPoints; i++) {
        const date = new Date(startDate.getTime() + (i * getIntervalForPeriod(period)));
        const trend = Math.sin(i / dataPoints * Math.PI * 2) * 0.1; // Long-term trend
        const noise = (Math.random() - 0.5) * 2 * volatility[asset];
        const price = basePrice[asset] * (1 + trend + noise);
        
        historicalData.push({
            timestamp: date.getTime(),
            date: date.toISOString().split('T')[0],
            price: Math.round(price * 100) / 100,
            volume: Math.floor(Math.random() * 1000000) + 100000
        });
    }
    
    return historicalData;
}

/**
 * Get data points count for each period
 * @param {string} period - Time period
 * @returns {number} Number of data points
 */
function getDataPointsForPeriod(period) {
    const points = {
        '1D': 24,    // Hourly data for 1 day
        '1W': 168,   // Hourly data for 1 week
        '1M': 720,   // Hourly data for 1 month
        '3M': 2160,  // Daily data for 3 months
        '1Y': 365    // Daily data for 1 year
    };
    
    return points[period] || 30;
}

/**
 * Get interval in milliseconds for each period
 * @param {string} period - Time period
 * @returns {number} Interval in milliseconds
 */
function getIntervalForPeriod(period) {
    const intervals = {
        '1D': 60 * 60 * 1000,      // 1 hour
        '1W': 60 * 60 * 1000,      // 1 hour
        '1M': 60 * 60 * 1000,      // 1 hour
        '3M': 24 * 60 * 60 * 1000, // 1 day
        '1Y': 24 * 60 * 60 * 1000  // 1 day
    };
    
    return intervals[period] || (24 * 60 * 60 * 1000);
}

/**
 * Get start date for period
 * @param {string} period - Time period
 * @returns {Date} Start date
 */
function getStartDateForPeriod(period) {
    const now = new Date();
    const startDate = new Date(now);
    
    switch (period) {
        case '1D':
            startDate.setDate(now.getDate() - 1);
            break;
        case '1W':
            startDate.setDate(now.getDate() - 7);
            break;
        case '1M':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case '3M':
            startDate.setMonth(now.getMonth() - 3);
            break;
        case '1Y':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            startDate.setMonth(now.getMonth() - 1);
    }
    
    return startDate;
}

/**
 * Get market news for specific asset
 * @param {string} asset - Asset type
 * @returns {Array} Market news
 */
async function getMarketNews(asset) {
    // In production, fetch from news APIs
    const news = {
        gold: [
            {
                id: 'news_1',
                title: 'Gold prices steady as investors await Fed decision',
                summary: 'Gold prices remain stable amid uncertainty over Federal Reserve monetary policy.',
                impact: 'NEUTRAL',
                timestamp: new Date(),
                source: 'MarketWatch'
            },
            {
                id: 'news_2',
                title: 'India Gold imports surge 25% in Q3',
                summary: 'Increased physical demand supports gold prices in domestic market.',
                impact: 'POSITIVE',
                timestamp: new Date(Date.now() - 3600000),
                source: 'Economic Times'
            }
        ],
        silver: [
            {
                id: 'news_3',
                title: 'Silver industrial demand picks up in electronics sector',
                summary: 'Growing demand from solar and electronics industries supports silver prices.',
                impact: 'POSITIVE',
                timestamp: new Date(Date.now() - 7200000),
                source: 'Reuters'
            }
        ],
        platinum: [
            {
                id: 'news_4',
                title: 'Platinum supply constraints from South Africa',
                summary: 'Mining disruptions in South Africa create supply concerns for platinum market.',
                impact: 'POSITIVE',
                timestamp: new Date(Date.now() - 10800000),
                source: 'Mining Weekly'
            }
        ],
        stablecoin: [
            {
                id: 'news_5',
                title: 'BINR stablecoin gains regulatory approval',
                summary: 'RBI grants final approval for BINR stablecoin operations.',
                impact: 'POSITIVE',
                timestamp: new Date(Date.now() - 14400000),
                source: 'RBI Official'
            }
        ]
    };
    
    return news[asset] || [];
}

/**
 * Get market analysis for asset
 * @param {string} asset - Asset type
 * @returns {Object} Market analysis
 */
async function getMarketAnalysis(asset) {
    const analyses = {
        gold: {
            trend: 'SIDEWAYS',
            strength: 'MEDIUM',
            support: 5950,
            resistance: 6100,
            sentiment: 'NEUTRAL',
            outlook: 'Gold prices are expected to trade sideways with a slight bullish bias as physical demand remains strong.',
            target: 6150,
            stopLoss: 5900,
            technicalIndicators: {
                rsi: 52.3,
                macd: 'NEUTRAL',
                movingAverage: 'ABOVE'
            }
        },
        silver: {
            trend: 'BULLISH',
            strength: 'WEAK',
            support: 75.0,
            resistance: 78.5,
            sentiment: 'POSITIVE',
            outlook: 'Silver shows mild bullish momentum supported by industrial demand.',
            target: 79.0,
            stopLoss: 74.5,
            technicalIndicators: {
                rsi: 58.7,
                macd: 'BULLISH',
                movingAverage: 'ABOVE'
            }
        },
        platinum: {
            trend: 'BEARISH',
            strength: 'WEAK',
            support: 2750,
            resistance: 2850,
            sentiment: 'NEGATIVE',
            outlook: 'Platinum faces headwinds from automotive sector weakness.',
            target: 2800,
            stopLoss: 2875,
            technicalIndicators: {
                rsi: 45.1,
                macd: 'BEARISH',
                movingAverage: 'BELOW'
            }
        },
        stablecoin: {
            trend: 'STABLE',
            strength: 'HIGH',
            support: 0.99,
            resistance: 1.01,
            sentiment: 'STABLE',
            outlook: 'BINR stablecoin maintains peg to INR with minimal volatility.',
            target: 1.00,
            stopLoss: 0.98,
            technicalIndicators: {
                rsi: 50.0,
                macd: 'NEUTRAL',
                movingAverage: 'NEUTRAL'
            }
        }
    };
    
    return analyses[asset] || analyses.gold;
}

/**
 * Get market indicators and economic data
 * @returns {Object} Market indicators
 */
async function getMarketIndicators() {
    return {
        usdInr: {
            rate: 83.25,
            change: 0.15,
            changePercent: 0.18,
            lastUpdate: new Date()
        },
        dollarIndex: {
            value: 104.50,
            change: -0.25,
            changePercent: -0.24,
            lastUpdate: new Date()
        },
        crudeOil: {
            price: 78.45, // USD per barrel
            change: 1.25,
            changePercent: 1.62,
            lastUpdate: new Date()
        },
        sensex: {
            value: 68500.25,
            change: -150.75,
            changePercent: -0.22,
            lastUpdate: new Date()
        },
        goldsilver: {
            ratio: 78.4, // Gold to Silver ratio
            change: 0.3,
            changePercent: 0.38,
            lastUpdate: new Date()
        }
    };
}

/**
 * Fallback rates in case of API failure
 * @returns {Object} Fallback rates
 */
function getFallbackRates() {
    return {
        gold: {
            price: 6000,
            change: 0,
            changePercent: 0,
            bid: 5940,
            ask: 6060,
            unit: 'gram',
            currency: 'INR',
            source: 'FALLBACK'
        },
        silver: {
            price: 75,
            change: 0,
            changePercent: 0,
            bid: 74.25,
            ask: 75.75,
            unit: 'gram',
            currency: 'INR',
            source: 'FALLBACK'
        },
        platinum: {
            price: 2800,
            change: 0,
            changePercent: 0,
            bid: 2772,
            ask: 2828,
            unit: 'gram',
            currency: 'INR',
            source: 'FALLBACK'
        },
        stablecoin: {
            price: 1.0,
            change: 0,
            changePercent: 0,
            bid: 0.99,
            ask: 1.01,
            unit: 'BINR',
            currency: 'INR',
            source: 'FALLBACK'
        }
    };
}

/**
 * Validate market data freshness
 * @param {Date} lastUpdate - Last update timestamp
 * @returns {boolean} Whether data is fresh
 */
function isDataFresh(lastUpdate) {
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return (now.getTime() - lastUpdate.getTime()) < maxAge;
}

/**
 * Format price for display
 * @param {number} price - Price value
 * @param {string} currency - Currency code
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted price
 */
function formatPrice(price, currency = 'INR', decimals = 2) {
    if (currency === 'INR') {
        return `₹${price.toLocaleString('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })}`;
    } else {
        return `${price.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })} ${currency}`;
    }
}

module.exports = {
    getMarketRates,
    getHistoricalPrices,
    getMarketNews,
    getMarketAnalysis,
    getMarketIndicators,
    getFallbackRates,
    isDataFresh,
    formatPrice
};