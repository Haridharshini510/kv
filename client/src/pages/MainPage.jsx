import { useState, useEffect } from 'react';
import { api } from '../services/api';
import VoiceOverlay from '../components/VoiceOverlay';
import BillOverlay from '../components/BillOverlay';
import CreateShopModal from '../components/CreateShopModal';

export default function MainPage() {
  const [shops, setShops] = useState([]);
  const [todaySummary, setTodaySummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Overlay states
  const [voiceOverlay, setVoiceOverlay] = useState({ open: false, shop: null });
  const [billOverlay, setBillOverlay] = useState({ open: false, shop: null });
  const [createShopModal, setCreateShopModal] = useState(false);

  // Double-click detection
  const [clickTimeout, setClickTimeout] = useState(null);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    loadShops();
    loadTodaySummary();
  }, []);

  async function loadShops() {
    try {
      const data = await api.getShops();
      setShops(data.shops || []);
    } catch (err) {
      setError('Failed to load shops: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTodaySummary() {
    try {
      const data = await api.getTodaySummary();

      const summary = {};
      data.summary?.forEach(shop => {
        summary[shop.shop_id] = {
          items: parseInt(shop.item_count) || 0,
          total: parseFloat(shop.total) || 0
        };
      });

      setTodaySummary(summary);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  }

  function handleShopClick(shop) {
    // Detect single vs double click
    setClickCount(prev => prev + 1);

    if (clickTimeout) {
      // This is a double click
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      setClickCount(0);
      handleDoubleClick(shop);
    } else {
      // Wait to see if it's a double click
      const timeout = setTimeout(() => {
        // Single click confirmed
        setClickTimeout(null);
        setClickCount(0);
        handleSingleClick(shop);
      }, 300); // 300ms window for double click

      setClickTimeout(timeout);
    }
  }

  function handleSingleClick(shop) {
    // Open voice overlay
    setVoiceOverlay({ open: true, shop });
  }

  function handleDoubleClick(shop) {
    // Open bill overlay
    setBillOverlay({ open: true, shop });
  }

  function handleVoiceComplete() {
    // Refresh summary after saving entry
    loadTodaySummary();
  }

  function handleCreateShop() {
    setCreateShopModal(true);
  }

  function handleShopCreated() {
    loadShops();
    setCreateShopModal(false);
  }

  if (loading) {
    return (
      <div className="main-page">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading shops...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-page">
      {/* Header */}
      <header className="main-header">
        <div className="header-left">
          <div className="kv-logo">🎤 KV</div>
          <div className="logo-subtitle">KadaiVoice</div>
        </div>
        <button
          className="btn btn-create-shop"
          onClick={handleCreateShop}
        >
          + Create Shop
        </button>
      </header>

      {/* Shop Grid */}
      <main className="shop-grid-container">
        {error && (
          <div className="error-banner">{error}</div>
        )}

        {shops.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏪</div>
            <h3>No shops yet</h3>
            <p>Create your first shop to get started</p>
            <button
              className="btn btn-primary btn-large"
              onClick={handleCreateShop}
            >
              + Create Shop
            </button>
          </div>
        ) : (
          <div className="shop-grid">
            {shops.map(shop => {
              const summary = todaySummary[shop.id] || { items: 0, total: 0 };

              return (
                <div
                  key={shop.id}
                  className="shop-card"
                  onClick={() => handleShopClick(shop)}
                >
                  <div className="shop-card-icon">🏪</div>
                  <h3 className="shop-card-name">{shop.name}</h3>
                  <div className="shop-card-stats">
                    <div className="shop-stat">
                      <span className="stat-label">Today</span>
                      <span className="stat-value">{summary.items} items</span>
                    </div>
                    <div className="shop-stat-total">
                      ₹{summary.total.toFixed(2)}
                    </div>
                  </div>
                  <div className="shop-card-hint">
                    <span className="hint-small">Tap once: Voice • Tap twice: Bill</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer hint */}
      <footer className="main-footer">
        <p className="footer-hint">
          💡 Single tap to add entry • Double tap to view bill
        </p>
      </footer>

      {/* Voice Overlay */}
      {voiceOverlay.open && (
        <VoiceOverlay
          shop={voiceOverlay.shop}
          onClose={() => setVoiceOverlay({ open: false, shop: null })}
          onComplete={handleVoiceComplete}
        />
      )}

      {/* Bill Overlay */}
      {billOverlay.open && (
        <BillOverlay
          shop={billOverlay.shop}
          onClose={() => setBillOverlay({ open: false, shop: null })}
        />
      )}

      {/* Create Shop Modal */}
      {createShopModal && (
        <CreateShopModal
          onClose={() => setCreateShopModal(false)}
          onShopCreated={handleShopCreated}
        />
      )}
    </div>
  );
}
