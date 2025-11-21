/**
 * Multi-Metal Token App - React Native Mobile Application
 * India's First Multi-Metal Token Trading Mobile App
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, PieChart } from 'react-native-chart-kit';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Asset Configuration
const ASSETS = {
  gold: {
    name: 'Gold',
    symbol: 'Au',
    unit: 'grams',
    color: '#fbbf24',
    gradient: ['#fbbf24', '#f59e0b'],
    icon: 'coins'
  },
  silver: {
    name: 'Silver',
    symbol: 'Ag', 
    unit: 'grams',
    color: '#e5e7eb',
    gradient: ['#e5e7eb', '#9ca3af'],
    icon: 'medal'
  },
  platinum: {
    name: 'Platinum',
    symbol: 'Pt',
    unit: 'grams', 
    color: '#a78bfa',
    gradient: ['#a78bfa', '#7c3aed'],
    icon: 'gem'
  },
  stablecoin: {
    name: 'BINR',
    symbol: 'BINR',
    unit: 'tokens',
    color: '#22c55e',
    gradient: ['#22c55e', '#16a34a'],
    icon: 'rupee-sign'
  }
};

// Main App Component
const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    loadMarketData();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        setUser({ token });
        loadUserData();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const loadMarketData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/market/rates`);
      const data = await response.json();
      setMarketData(data.assets || {});
    } catch (error) {
      console.error('Failed to load market data:', error);
      // Set fallback data
      setMarketData({
        gold: { price: 6025.50, change: 0.25 },
        silver: { price: 76.80, change: 1.12 },
        platinum: { price: 2825.30, change: -0.45 },
        stablecoin: { price: 1.0, change: 0 }
      });
    }
  };

  const loadUserData = async () => {
    if (!user?.token) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/portfolio`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPortfolio(data);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMarketData();
    if (user) {
      loadUserData();
    }
    setRefreshing(false);
  };

  // Dashboard Tab
  const DashboardTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Portfolio Summary */}
      <View style={styles.portfolioCard}>
        <Text style={styles.sectionTitle}>Portfolio Overview</Text>
        <View style={styles.portfolioSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={styles.summaryValue}>₹{portfolio?.totalValue?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Today's P&L</Text>
            <Text style={styles.summaryChange}>+₹2,450 (+0.8%)</Text>
          </View>
        </View>
      </View>

      {/* Asset Holdings */}
      <View style={styles.holdingsCard}>
        <Text style={styles.sectionTitle}>Holdings</Text>
        {Object.entries(ASSETS).map(([key, asset]) => {
          const holding = portfolio?.assets?.[key];
          return (
            <View key={key} style={styles.holdingItem}>
              <LinearGradient
                colors={asset.gradient}
                style={styles.assetIcon}
              >
                <Icon name={asset.icon} size={20} color="#fff" />
              </LinearGradient>
              <View style={styles.holdingInfo}>
                <Text style={styles.assetName}>{asset.name}</Text>
                <Text style={styles.assetBalance}>
                  {holding?.balance?.toFixed(3) || '0.000'} {asset.unit}
                </Text>
              </View>
              <View style={styles.holdingValue}>
                <Text style={styles.assetValue}>
                  ₹{holding?.currentValue?.toLocaleString() || '0'}
                </Text>
                <Text style={styles.assetChange}>
                  {holding?.profitPercent?.toFixed(2) || '0.00'}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Market Rates */}
      <View style={styles.marketCard}>
        <Text style={styles.sectionTitle}>Live Market Rates</Text>
        <View style={styles.ratesGrid}>
          {Object.entries(ASSETS).map(([key, asset]) => {
            const rate = marketData[key];
            return (
              <TouchableOpacity
                key={key}
                style={styles.rateCard}
                onPress={() => openTradeModal(key, 'buy')}
              >
                <LinearGradient
                  colors={asset.gradient}
                  style={styles.rateHeader}
                >
                  <Icon name={asset.icon} size={24} color="#fff" />
                  <Text style={styles.rateAssetName}>{asset.name}</Text>
                </LinearGradient>
                <View style={styles.rateBody}>
                  <Text style={styles.ratePrice}>
                    ₹{rate?.price?.toLocaleString() || '0'}
                  </Text>
                  <Text style={[
                    styles.rateChange,
                    { color: (rate?.change || 0) >= 0 ? '#10b981' : '#ef4444' }
                  ]}>
                    {rate?.change >= 0 ? '+' : ''}{rate?.change?.toFixed(2) || '0.00'}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.buyButton]}
            onPress={() => setActiveTab('trade')}
          >
            <Icon name="shopping-cart" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.sellButton]}
            onPress={() => setActiveTab('trade')}
          >
            <Icon name="money-bill-wave" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Sell</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.swapButton]}
            onPress={() => setActiveTab('trade')}
          >
            <Icon name="exchange-alt" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Swap</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.sipButton]}
            onPress={() => setActiveTab('sip')}
          >
            <Icon name="calendar-alt" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>SIP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  // Trade Tab
  const TradeTab = () => {
    const [selectedAsset, setSelectedAsset] = useState('gold');
    const [tradeType, setTradeType] = useState('buy');
    const [amount, setAmount] = useState('');

    const executeTrade = async () => {
      if (!user?.token) {
        Alert.alert('Login Required', 'Please login to trade');
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid amount');
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/trade/${tradeType}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            asset: selectedAsset,
            amount: parseFloat(amount),
            paymentMethod: 'UPI',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          Alert.alert('Success', `${tradeType} order created successfully`);
          setAmount('');
          loadUserData();
        } else {
          const error = await response.json();
          Alert.alert('Error', error.error || 'Trade failed');
        }
      } catch (error) {
        Alert.alert('Error', 'Trade execution failed');
      } finally {
        setLoading(false);
      }
    };

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.tradeCard}>
          {/* Trade Type Toggle */}
          <View style={styles.tradeTypeToggle}>
            <TouchableOpacity
              style={[
                styles.tradeTypeButton,
                tradeType === 'buy' && styles.tradeTypeButtonActive,
              ]}
              onPress={() => setTradeType('buy')}
            >
              <Text style={[
                styles.tradeTypeButtonText,
                tradeType === 'buy' && styles.tradeTypeButtonTextActive,
              ]}>
                Buy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tradeTypeButton,
                tradeType === 'sell' && styles.tradeTypeButtonActive,
              ]}
              onPress={() => setTradeType('sell')}
            >
              <Text style={[
                styles.tradeTypeButtonText,
                tradeType === 'sell' && styles.tradeTypeButtonTextActive,
              ]}>
                Sell
              </Text>
            </TouchableOpacity>
          </View>

          {/* Asset Selection */}
          <Text style={styles.inputLabel}>Select Asset</Text>
          <View style={styles.assetGrid}>
            {Object.entries(ASSETS).map(([key, asset]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.assetOption,
                  selectedAsset === key && styles.assetOptionSelected,
                ]}
                onPress={() => setSelectedAsset(key)}
              >
                <LinearGradient
                  colors={selectedAsset === key ? asset.gradient : ['#f3f4f6', '#e5e7eb']}
                  style={styles.assetOptionGradient}
                >
                  <Icon
                    name={asset.icon}
                    size={24}
                    color={selectedAsset === key ? '#fff' : '#6b7280'}
                  />
                  <Text style={[
                    styles.assetOptionText,
                    selectedAsset === key && styles.assetOptionTextSelected,
                  ]}>
                    {asset.name}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount Input */}
          <Text style={styles.inputLabel}>Amount ({ASSETS[selectedAsset]?.unit})</Text>
          <TextInput
            style={styles.amountInput}
            placeholder={`Enter amount in ${ASSETS[selectedAsset]?.unit}`}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          {/* Current Rate */}
          <View style={styles.rateDisplay}>
            <Text style={styles.rateLabel}>Current Rate:</Text>
            <Text style={styles.rateValue}>
              ₹{marketData[selectedAsset]?.price?.toLocaleString() || '0'}
            </Text>
          </View>

          {/* Execute Button */}
          <TouchableOpacity
            style={[
              styles.executeButton,
              tradeType === 'buy' ? styles.buyButton : styles.sellButton,
            ]}
            onPress={executeTrade}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon
                  name={tradeType === 'buy' ? 'shopping-cart' : 'money-bill-wave'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.executeButtonText}>
                  {tradeType.charAt(0).toUpperCase() + tradeType.slice(1)} {ASSETS[selectedAsset]?.name}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // SIP Tab
  const SIPTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.sipCard}>
        <Text style={styles.sectionTitle}>Create SIP Plan</Text>
        <Text style={styles.sipDescription}>
          Automated investment with ₹50/month fee
        </Text>
        
        <TouchableOpacity style={styles.createSIPButton}>
          <LinearGradient
            colors={['#3b82f6', '#1d4ed8']}
            style={styles.createSIPGradient}
          >
            <Icon name="plus" size={20} color="#fff" />
            <Text style={styles.createSIPButtonText}>Create SIP Plan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.activeSIPCard}>
        <Text style={styles.sectionTitle}>Active SIP Plans</Text>
        <Text style={styles.noSIPText}>No active SIP plans</Text>
      </View>
    </ScrollView>
  );

  // Login Component (simplified)
  const LoginComponent = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          const data = await response.json();
          await AsyncStorage.setItem('authToken', data.token);
          setUser({ token: data.token });
          loadUserData();
        } else {
          Alert.alert('Error', 'Login failed');
        }
      } catch (error) {
        Alert.alert('Error', 'Network error');
      }
    };

    return (
      <ScrollView contentContainerStyle={styles.loginContainer}>
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>MultiMetal Token</Text>
          <Text style={styles.loginSubtitle}>India's First Multi-Metal Token App</Text>
          
          <TextInput
            style={styles.loginInput}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.loginInput}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Main render
  if (!user) {
    return <LoginComponent />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'trade':
        return <TradeTab />;
      case 'sip':
        return <SIPTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MultiMetal Token</Text>
        <TouchableOpacity onPress={() => setActiveTab('profile')}>
          <Icon name="user-circle" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('dashboard')}
        >
          <Icon
            name="chart-pie"
            size={20}
            color={activeTab === 'dashboard' ? '#3b82f6' : '#6b7280'}
          />
          <Text style={[
            styles.navItemText,
            activeTab === 'dashboard' && styles.navItemTextActive,
          ]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('trade')}
        >
          <Icon
            name="exchange-alt"
            size={20}
            color={activeTab === 'trade' ? '#3b82f6' : '#6b7280'}
          />
          <Text style={[
            styles.navItemText,
            activeTab === 'trade' && styles.navItemTextActive,
          ]}>
            Trade
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('sip')}
        >
          <Icon
            name="calendar-alt"
            size={20}
            color={activeTab === 'sip' ? '#3b82f6' : '#6b7280'}
          />
          <Text style={[
            styles.navItemText,
            activeTab === 'sip' && styles.navItemTextActive,
          ]}>
            SIP
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('portfolio')}
        >
          <Icon
            name="wallet"
            size={20}
            color={activeTab === 'portfolio' ? '#3b82f6' : '#6b7280'}
          />
          <Text style={[
            styles.navItemText,
            activeTab === 'portfolio' && styles.navItemTextActive,
          ]}>
            Portfolio
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tabContent: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  portfolioCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  portfolioSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryChange: {
    fontSize: 16,
    color: '#10b981',
  },
  holdingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  holdingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  holdingInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  assetBalance: {
    fontSize: 14,
    color: '#6b7280',
  },
  holdingValue: {
    alignItems: 'flex-end',
  },
  assetValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  assetChange: {
    fontSize: 12,
    color: '#10b981',
  },
  marketCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  rateCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rateHeader: {
    padding: 15,
    alignItems: 'center',
  },
  rateAssetName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
  },
  rateBody: {
    padding: 15,
    alignItems: 'center',
  },
  ratePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  rateChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  buyButton: {
    backgroundColor: '#10b981',
  },
  sellButton: {
    backgroundColor: '#ef4444',
  },
  swapButton: {
    backgroundColor: '#f59e0b',
  },
  sipButton: {
    backgroundColor: '#8b5cf6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  tradeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tradeTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tradeTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  tradeTypeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  tradeTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  tradeTypeButtonTextActive: {
    color: '#fff',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  assetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  assetOption: {
    width: (width - 60) / 2,
    marginBottom: 10,
  },
  assetOptionSelected: {
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 8,
  },
  assetOptionGradient: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  assetOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 5,
  },
  assetOptionTextSelected: {
    color: '#fff',
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  rateDisplay: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  rateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  executeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
  },
  executeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sipCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sipDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  createSIPButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  createSIPGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  createSIPButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeSIPCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noSIPText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 40,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  loginButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 10,
  },
  loginButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  navItemText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  navItemTextActive: {
    color: '#3b82f6',
  },
});

export default App;