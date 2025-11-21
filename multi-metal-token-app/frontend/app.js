// India's First Multi-Metal Token App - Frontend JavaScript
// Comprehensive trading platform for Gold, Silver, Platinum, and Stablecoin

// Global Application State
const AppState = {
    currentUser: null,
    portfolio: {
        gold: { balance: 0, value: 0 },
        silver: { balance: 0, value: 0 },
        platinum: { balance: 0, value: 0 },
        stablecoin: { balance: 0, value: 0 },
        totalValue: 0
    },
    marketRates: {
        gold: 6025.50,
        silver: 76.80,
        platinum: 2825.30,
        stablecoin: 1.0
    },
    sipPlans: [],
    transactions: [],
    currentSection: 'dashboard',
    isAuthenticated: false
};

// Asset Configuration
const AssetConfig = {
    gold: {
        name: 'Gold',
        symbol: 'Au',
        unit: 'grams',
        color: '#fbbf24',
        icon: 'fas fa-coins',
        minAmount: 0.1,
        currentPrice: 6025.50
    },
    silver: {
        name: 'Silver',
        symbol: 'Ag',
        unit: 'grams',
        color: '#e5e7eb',
        icon: 'fas fa-medal',
        minAmount: 1,
        currentPrice: 76.80
    },
    platinum: {
        name: 'Platinum',
        symbol: 'Pt',
        unit: 'grams',
        color: '#a78bfa',
        icon: 'fas fa-gem',
        minAmount: 0.1,
        currentPrice: 2825.30
    },
    stablecoin: {
        name: 'BINR Stablecoin',
        symbol: 'BINR',
        unit: 'tokens',
        color: '#22c55e',
        icon: 'fas fa-rupee-sign',
        minAmount: 100,
        currentPrice: 1.0
    }
};

// Fee Structure Configuration
const FeeStructure = {
    spread: 0.01, // 1%
    platform: 0.001, // 0.1%
    gst: 0.18, // 18%
    sip: {
        monthly: 50,
        weekly: 12.5,
        daily: 1.67
    },
    swap: [
        { min: 1000000, rate: 0.001 }, // 0.1%
        { min: 500000, rate: 0.002 },  // 0.2%
        { min: 100000, rate: 0.003 },  // 0.3%
        { min: 50000, rate: 0.004 },   // 0.4%
        { min: 0, rate: 0.005 }        // 0.5%
    ]
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Load user session
        loadUserSession();
        
        // Initialize navigation
        initializeNavigation();
        
        // Load market data
        await loadMarketData();
        
        // Initialize charts
        initializeCharts();
        
        // Initialize event listeners
        initializeEventListeners();
        
        // Load user data if authenticated
        if (AppState.isAuthenticated) {
            await loadUserData();
        }
        
        // Start real-time updates
        startRealTimeUpdates();
        
        console.log('Multi-Metal Token App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showNotification('Failed to initialize application', 'error');
    }
}

// Navigation Functions
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Show target section
            contentSections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            AppState.currentSection = targetId;
            
            // Load section-specific data
            loadSectionData(targetId);
        });
    });
}

function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'portfolio':
            loadPortfolioData();
            break;
        case 'sip':
            loadSIPData();
            break;
        case 'history':
            loadTransactionHistory();
            break;
        case 'fees':
            updateFeeCalculator();
            break;
    }
}

// Market Data Functions
async function loadMarketData() {
    try {
        const response = await fetch('/api/market/rates');
        const data = await response.json();
        
        if (data.assets) {
            AppState.marketRates = {
                gold: data.assets.gold.price,
                silver: data.assets.silver.price,
                platinum: data.assets.platinum.price,
                stablecoin: data.assets.stablecoin.price
            };
            
            updateMarketDisplays();
        }
    } catch (error) {
        console.error('Failed to load market data:', error);
        // Use fallback data
        updateMarketDisplays();
    }
}

function updateMarketDisplays() {
    // Update rate displays
    const rateElements = {
        gold: document.getElementById('goldRate'),
        silver: document.getElementById('silverRate'),
        platinum: document.getElementById('platinumRate'),
        stablecoin: document.getElementById('stablecoinRate')
    };
    
    Object.keys(rateElements).forEach(asset => {
        if (rateElements[asset]) {
            const price = AppState.marketRates[asset];
            rateElements[asset].textContent = formatPrice(price, asset);
        }
    });
    
    // Update last updated time
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = new Date().toLocaleTimeString();
    }
}

function formatPrice(price, asset) {
    const config = AssetConfig[asset];
    if (asset === 'stablecoin') {
        return `₹${price.toFixed(2)}`;
    }
    return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Portfolio Functions
async function loadUserData() {
    if (!AppState.isAuthenticated) return;
    
    try {
        // Load portfolio
        const portfolioResponse = await fetch('/api/portfolio', {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (portfolioResponse.ok) {
            const portfolio = await portfolioResponse.json();
            updatePortfolioDisplay(portfolio);
        }
        
        // Load SIP plans
        const sipResponse = await fetch('/api/sip/plans', {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (sipResponse.ok) {
            const sipData = await sipResponse.json();
            AppState.sipPlans = sipData.plans || [];
            updateSIPDisplay();
        }
        
        // Load recent transactions
        await loadTransactionHistory();
        
    } catch (error) {
        console.error('Failed to load user data:', error);
    }
}

function updatePortfolioDisplay(portfolio) {
    if (!portfolio) return;
    
    // Update portfolio summary cards
    updateSummaryCard('totalValue', portfolio.totalValue, portfolio.totalProfitPercent);
    updateSummaryCard('goldValue', portfolio.assets.gold.balance, portfolio.assets.gold.profitPercent, 'g');
    updateSummaryCard('silverValue', portfolio.assets.silver.balance, portfolio.assets.silver.profitPercent, 'g');
    updateSummaryCard('platinumValue', portfolio.assets.platinum.balance, portfolio.assets.platinum.profitPercent, 'g');
    updateSummaryCard('stablecoinValue', portfolio.assets.stablecoin.balance, 0);
    
    // Update holdings table
    updateHoldingsTable(portfolio.assets);
    
    // Update charts
    updateCharts(portfolio);
}

function updateSummaryCard(elementId, value, changePercent, unit = '') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (unit === 'g') {
        element.textContent = `${value.toFixed(3)} ${unit}`;
    } else if (unit === '') {
        element.textContent = formatCurrency(value);
    }
    
    const changeElement = document.getElementById(elementId.replace('Value', 'Change'));
    if (changeElement && changePercent !== undefined) {
        const changeValue = formatCurrency(Math.abs(changePercent * value / 100));
        const changeText = `${changePercent >= 0 ? '+' : '-'}${changeValue} (${Math.abs(changePercent).toFixed(2)}%)`;
        changeElement.textContent = changeText;
        changeElement.className = `change ${changePercent >= 0 ? 'positive' : 'negative'}`;
    }
}

function updateHoldingsTable(assets) {
    const tableBody = document.getElementById('holdingsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    Object.keys(assets).forEach(asset => {
        const holding = assets[asset];
        const config = AssetConfig[asset];
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center;">
                    <i class="${config.icon}" style="color: ${config.color}; margin-right: 8px;"></i>
                    <span>${config.name}</span>
                </div>
            </td>
            <td>${holding.balance.toFixed(3)} ${config.unit}</td>
            <td>${formatCurrency(holding.currentValue)}</td>
            <td>${formatCurrency(holding.investedValue)}</td>
            <td class="${holding.profit >= 0 ? 'text-success' : 'text-error'}">
                ${formatCurrency(holding.profit)} (${holding.profitPercent.toFixed(2)}%)
            </td>
            <td>${holding.allocation.toFixed(1)}%</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openTradeModal('${asset}', 'buy')">Trade</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function formatCurrency(amount) {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Trading Functions
function selectAsset(asset) {
    // Update asset selection UI
    document.querySelectorAll('.asset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectedBtn = document.querySelector(`[data-asset="${asset}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Update form values
    updateTradeForm(asset);
}

function updateTradeForm(asset) {
    const config = AssetConfig[asset];
    const amountUnit = document.getElementById('amountUnit');
    const minAmount = document.getElementById('minAmount');
    const availableBalance = document.getElementById('availableBalance');
    const currentRate = document.getElementById('currentRate');
    const tradeBtn = document.getElementById('tradeBtn');
    
    if (amountUnit) {
        amountUnit.innerHTML = `<option value="asset">${config.unit}</option><option value="inr">INR</option>`;
    }
    
    if (minAmount) {
        minAmount.textContent = config.minAmount;
    }
    
    if (availableBalance && AppState.portfolio[asset]) {
        availableBalance.textContent = AppState.portfolio[asset].balance.toFixed(3);
    }
    
    if (currentRate) {
        currentRate.textContent = formatPrice(AppState.marketRates[asset], asset);
    }
    
    if (tradeBtn) {
        const tradeType = document.querySelector('.tab-btn.active').textContent.toLowerCase();
        tradeBtn.innerHTML = `<i class="fas fa-${tradeType === 'buy' ? 'shopping-cart' : 'money-bill-wave'}"></i> ${tradeType.charAt(0).toUpperCase() + tradeType.slice(1)} ${config.name}`;
    }
}

function calculateTrade() {
    const amount = parseFloat(document.getElementById('tradeAmount').value) || 0;
    const amountUnit = document.getElementById('amountUnit').value;
    const activeAsset = document.querySelector('.asset-btn.active')?.dataset.asset || 'gold';
    const config = AssetConfig[activeAsset];
    
    if (amount <= 0) {
        updateFeeDisplay(0, activeAsset);
        return;
    }
    
    // Calculate amount in INR
    let inrAmount;
    if (amountUnit === 'inr') {
        inrAmount = amount;
    } else {
        inrAmount = amount * AppState.marketRates[activeAsset];
    }
    
    updateFeeDisplay(inrAmount, activeAsset);
}

function updateFeeDisplay(inrAmount, asset) {
    // Calculate fees
    const spreadFee = inrAmount * FeeStructure.spread;
    const platformFee = inrAmount * FeeStructure.platform;
    const totalFee = spreadFee + platformFee;
    const gst = totalFee * FeeStructure.gst;
    const totalCost = inrAmount + totalFee + gst;
    
    // Update display elements
    const elements = {
        principalAmount: document.getElementById('principalAmount'),
        spreadFee: document.getElementById('spreadFee'),
        platformFee: document.getElementById('platformFee'),
        gstFee: document.getElementById('gstFee'),
        totalCost: document.getElementById('totalCost')
    };
    
    if (elements.principalAmount) elements.principalAmount.textContent = formatCurrency(inrAmount);
    if (elements.spreadFee) elements.spreadFee.textContent = formatCurrency(spreadFee);
    if (elements.platformFee) elements.platformFee.textContent = formatCurrency(platformFee);
    if (elements.gstFee) elements.gstFee.textContent = formatCurrency(gst);
    if (elements.totalCost) elements.totalCost.textContent = formatCurrency(totalCost);
}

async function executeTrade() {
    if (!AppState.isAuthenticated) {
        showNotification('Please login to trade', 'error');
        return;
    }
    
    const tradeType = document.querySelector('.tab-btn.active').textContent.toLowerCase();
    const asset = document.querySelector('.asset-btn.active')?.dataset.asset;
    const amount = parseFloat(document.getElementById('tradeAmount').value);
    const amountUnit = document.getElementById('amountUnit').value;
    
    if (!asset || !amount || amount <= 0) {
        showNotification('Please enter valid trade details', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/trade/${tradeType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                asset,
                amount,
                paymentMethod: 'UPI' // Default payment method
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(`${tradeType.charAt(0).toUpperCase() + tradeType.slice(1)} order created successfully`, 'success');
            
            // Reset form
            document.getElementById('tradeAmount').value = '';
            calculateTrade();
            
            // Reload user data
            await loadUserData();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Trade failed', 'error');
        }
    } catch (error) {
        console.error('Trade execution error:', error);
        showNotification('Trade execution failed', 'error');
    }
}

// SIP Functions
function updateSIPDisplay() {
    const sipCardsContainer = document.getElementById('sipCards');
    if (!sipCardsContainer) return;
    
    sipCardsContainer.innerHTML = '';
    
    AppState.sipPlans.forEach(plan => {
        const config = AssetConfig[plan.asset];
        const card = document.createElement('div');
        card.className = 'sip-card';
        card.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center;">
                    <i class="${config.icon}" style="color: ${config.color}; margin-right: 8px;"></i>
                    <strong>${config.name} SIP</strong>
                </div>
                <span class="status-badge" style="background: ${plan.status === 'ACTIVE' ? '#10b981' : '#ef4444'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${plan.status}
                </span>
            </div>
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
                Amount: ${formatCurrency(plan.amount)} | Frequency: ${plan.frequency}
            </div>
            <div style="font-size: 12px; color: #9ca3af;">
                Next Purchase: ${new Date(plan.nextPurchaseDate).toLocaleDateString()}
            </div>
        `;
        sipCardsContainer.appendChild(card);
    });
}

// Transaction History Functions
async function loadTransactionHistory() {
    if (!AppState.isAuthenticated) return;
    
    try {
        const response = await fetch('/api/transactions?limit=50', {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            AppState.transactions = data.transactions;
            updateTransactionHistoryDisplay();
        }
    } catch (error) {
        console.error('Failed to load transaction history:', error);
    }
}

function updateTransactionHistoryDisplay() {
    const tableBody = document.getElementById('transactionsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    AppState.transactions.slice(0, 20).forEach(tx => {
        const config = AssetConfig[tx.asset];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
            <td>
                <span class="badge badge-${tx.type.toLowerCase()}">${tx.type}</span>
            </td>
            <td>
                <div style="display: flex; align-items: center;">
                    <i class="${config.icon}" style="color: ${config.color}; margin-right: 8px; font-size: 12px;"></i>
                    ${config.name}
                </div>
            </td>
            <td>${tx.amount.toFixed(3)} ${config.unit}</td>
            <td>${formatPrice(tx.price, tx.asset)}</td>
            <td>${formatCurrency(tx.totalCost || tx.netAmount)}</td>
            <td>
                <span class="status-badge status-${tx.status.toLowerCase()}">${tx.status}</span>
            </td>
            <td>${formatCurrency(tx.fees?.totalFee || 0)}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Fee Calculator Functions
function updateFeeCalculator() {
    const calcAmount = document.getElementById('calcAmount');
    if (calcAmount) {
        calcAmount.addEventListener('input', calculateFees);
    }
}

function calculateFees() {
    const calcType = document.getElementById('calcType').value;
    const calcAsset = document.getElementById('calcAsset').value;
    const calcAmount = parseFloat(document.getElementById('calcAmount').value) || 0;
    
    if (calcAmount <= 0) {
        document.getElementById('calcResults').innerHTML = '<p>Enter an amount to calculate fees</p>';
        return;
    }
    
    let totalFees = 0;
    let feeBreakdown = [];
    
    if (calcType === 'buy' || calcType === 'sell') {
        const spreadFee = calcAmount * FeeStructure.spread;
        const platformFee = calcAmount * FeeStructure.platform;
        const gst = (spreadFee + platformFee) * FeeStructure.gst;
        totalFees = spreadFee + platformFee + gst;
        
        feeBreakdown = [
            { label: 'Spread Fee (1%)', amount: spreadFee },
            { label: 'Platform Fee (0.1%)', amount: platformFee },
            { label: 'GST (18%)', amount: gst }
        ];
    } else if (calcType === 'swap') {
        // Find appropriate swap fee rate
        const swapRate = FeeStructure.swap.find(rate => calcAmount >= rate.min)?.rate || 0.005;
        totalFees = calcAmount * swapRate;
        
        feeBreakdown = [
            { label: `Swap Fee (${(swapRate * 100).toFixed(1)}%)`, amount: totalFees }
        ];
    }
    
    displayFeeResults(totalFees, feeBreakdown, calcAmount);
}

function displayFeeResults(totalFees, breakdown, principal) {
    const resultsContainer = document.getElementById('calcResults');
    if (!resultsContainer) return;
    
    let html = `
        <div class="calc-result-item">
            <span>Principal Amount:</span>
            <span>${formatCurrency(principal)}</span>
        </div>
    `;
    
    breakdown.forEach(item => {
        html += `
            <div class="calc-result-item">
                <span>${item.label}:</span>
                <span>${formatCurrency(item.amount)}</span>
            </div>
        `;
    });
    
    html += `
        <div class="calc-result-item">
            <span><strong>Total Fees:</strong></span>
            <span><strong>${formatCurrency(totalFees)}</strong></span>
        </div>
        <div class="calc-result-item">
            <span><strong>Total Cost:</strong></span>
            <span><strong>${formatCurrency(principal + totalFees)}</strong></span>
        </div>
    `;
    
    resultsContainer.innerHTML = html;
}

// Chart Functions
let allocationChart = null;
let performanceChart = null;

function initializeCharts() {
    // Initialize allocation chart
    const allocationCtx = document.getElementById('allocationChart');
    if (allocationCtx) {
        allocationChart = new Chart(allocationCtx, {
            type: 'doughnut',
            data: {
                labels: ['Gold', 'Silver', 'Platinum', 'BINR'],
                datasets: [{
                    data: [25, 25, 25, 25],
                    backgroundColor: [
                        '#fbbf24',
                        '#e5e7eb',
                        '#a78bfa',
                        '#22c55e'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Initialize performance chart
    const performanceCtx = document.getElementById('performanceChart');
    if (performanceCtx) {
        performanceChart = new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Portfolio Value',
                    data: [100000, 105000, 98000, 110000, 115000, 120000],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }
}

function updateCharts(portfolio) {
    // Update allocation chart
    if (allocationChart && portfolio.assets) {
        const data = [
            portfolio.assets.gold.currentValue,
            portfolio.assets.silver.currentValue,
            portfolio.assets.platinum.currentValue,
            portfolio.assets.stablecoin.currentValue
        ];
        
        allocationChart.data.datasets[0].data = data;
        allocationChart.update();
    }
}

// Modal Functions
function openTradeModal(asset, action) {
    const modal = document.getElementById('tradeModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    const config = AssetConfig[asset];
    modalTitle.textContent = `${action.charAt(0).toUpperCase() + action.slice(1)} ${config.name}`;
    
    // Create trade form content
    modalBody.innerHTML = `
        <form id="modalTradeForm">
            <div class="form-group">
                <label>Amount (${config.unit})</label>
                <input type="number" id="modalAmount" placeholder="Enter amount" min="${config.minAmount}" step="0.001" required>
            </div>
            <div class="form-group">
                <label>Payment Method</label>
                <select id="modalPaymentMethod">
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Credit/Debit Card</option>
                </select>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal('tradeModal')">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-${action === 'buy' ? 'shopping-cart' : 'money-bill-wave'}"></i>
                    ${action.charAt(0).toUpperCase() + action.slice(1)} ${config.name}
                </button>
            </div>
        </form>
    `;
    
    modal.classList.add('active');
    
    // Handle form submission
    const form = document.getElementById('modalTradeForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const amount = parseFloat(document.getElementById('modalAmount').value);
            const paymentMethod = document.getElementById('modalPaymentMethod').value;
            
            await executeModalTrade(asset, action, amount, paymentMethod);
        });
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

async function executeModalTrade(asset, action, amount, paymentMethod) {
    if (!AppState.isAuthenticated) {
        showNotification('Please login to trade', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/trade/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                asset,
                amount,
                paymentMethod
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} order created successfully`, 'success');
            closeModal('tradeModal');
            await loadUserData();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Trade failed', 'error');
        }
    } catch (error) {
        console.error('Modal trade error:', error);
        showNotification('Trade execution failed', 'error');
    }
}

// Real-time Updates
function startRealTimeUpdates() {
    // Update market rates every 30 seconds
    setInterval(loadMarketData, 30000);
    
    // Update portfolio every 5 minutes
    setInterval(() => {
        if (AppState.isAuthenticated) {
            loadUserData();
        }
    }, 300000);
}

// Utility Functions
function getAuthToken() {
    return localStorage.getItem('authToken') || '';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function loadUserSession() {
    const token = getAuthToken();
    if (token) {
        AppState.isAuthenticated = true;
        // Update UI to show logged-in state
        updateAuthUI();
    }
}

function updateAuthUI() {
    const userName = document.getElementById('userName');
    if (userName && AppState.currentUser) {
        userName.textContent = AppState.currentUser.email || 'User';
    }
}

function logout() {
    localStorage.removeItem('authToken');
    AppState.isAuthenticated = false;
    AppState.currentUser = null;
    
    // Update UI to show logged-out state
    document.getElementById('userName').textContent = 'Guest User';
    
    showNotification('Logged out successfully', 'success');
}

// Mobile Menu Functions
function toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

function toggleUserMenu() {
    const userDropdown = document.getElementById('userDropdown');
    userDropdown.classList.toggle('active');
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export functions for global access
window.openTradeModal = openTradeModal;
window.closeModal = closeModal;
window.executeTrade = executeTrade;
window.selectAsset = selectAsset;
window.calculateTrade = calculateTrade;
window.calculateFees = calculateFees;
window.applyFilters = function() { loadTransactionHistory(); };
window.logout = logout;
window.toggleUserMenu = toggleUserMenu;
window.toggleMobileMenu = toggleMobileMenu;