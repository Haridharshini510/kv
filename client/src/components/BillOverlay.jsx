import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { generatePDF } from '../services/pdfGenerator';
import { shareViaWhatsApp } from '../services/whatsappShare';

export default function BillOverlay({ shop, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    loadBill();
  }, []);

  async function loadBill() {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const data = await api.getSalesEntries({
        date: today,
        shop_id: shop.id
      });

      const shopEntries = data.sales_entries || [];
      const allItems = [];
      let totalAmount = 0;

      shopEntries.forEach(entry => {
        if (entry.items && Array.isArray(entry.items)) {
          entry.items.forEach(item => {
            allItems.push({
              product_name: item.product_name_snapshot || item.product_name,
              quantity: parseFloat(item.quantity),
              unit_price: parseFloat(item.unit_price),
              line_total: parseFloat(item.line_total)
            });
            totalAmount += parseFloat(item.line_total);
          });
        }
      });

      setItems(allItems);
      setTotal(totalAmount);
    } catch (err) {
      setError('Failed to load bill: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPDF() {
    try {
      setGeneratingPDF(true);

      const billData = {
        shop,
        date: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }),
        items,
        total
      };

      await generatePDF(billData);
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setGeneratingPDF(false);
    }
  }

  async function handleWhatsAppShare() {
    try {
      const billData = {
        shop,
        date: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }),
        items,
        total
      };

      await shareViaWhatsApp(billData);
    } catch (err) {
      alert('Failed to share: ' + err.message);
    }
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-content bill-overlay" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="overlay-header no-print">
          <h2 className="overlay-title">📄 {shop.name} - Bill</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="overlay-body">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading bill...</p>
            </div>
          )}

          {error && (
            <div className="error-message">{error}</div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="empty-bill">
              <div className="empty-icon">📋</div>
              <h3>No entries today</h3>
              <p>Add some entries first to generate a bill</p>
              <button className="btn btn-primary" onClick={onClose}>
                Go Back
              </button>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="bill-document">
              {/* Invoice Header */}
              <div className="bill-header">
                <h1 className="bill-title">INVOICE</h1>
                <div className="bill-shop-name">{shop.name}</div>
                {shop.phone && (
                  <div className="bill-shop-detail">📱 {shop.phone}</div>
                )}
                {shop.address && (
                  <div className="bill-shop-detail">📍 {shop.address}</div>
                )}
                <div className="bill-date">
                  📅 {new Date().toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>

              {/* Items Table */}
              <table className="bill-table">
                <thead>
                  <tr>
                    <th className="col-sr">Sr.</th>
                    <th className="col-product">Product</th>
                    <th className="col-qty">Qty</th>
                    <th className="col-price">Price</th>
                    <th className="col-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="col-sr">{index + 1}</td>
                      <td className="col-product">{item.product_name}</td>
                      <td className="col-qty">{item.quantity}</td>
                      <td className="col-price">₹{item.unit_price.toFixed(2)}</td>
                      <td className="col-total">₹{item.line_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div className="bill-total">
                <div className="total-row">
                  <span className="total-label">Subtotal:</span>
                  <span className="total-value">₹{total.toFixed(2)}</span>
                </div>
                <div className="total-row grand-total">
                  <span className="total-label">Grand Total:</span>
                  <span className="total-value">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="bill-footer-text">
                <p>Thank you for your business!</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!loading && !error && items.length > 0 && (
          <div className="overlay-footer no-print">
            <button
              className="btn btn-primary"
              onClick={handlePrint}
            >
              🖨️ Print
            </button>

            <button
              className="btn btn-success"
              onClick={handleDownloadPDF}
              disabled={generatingPDF}
            >
              {generatingPDF ? 'Generating...' : '📥 PDF'}
            </button>

            <button
              className="btn btn-whatsapp"
              onClick={handleWhatsAppShare}
            >
              📱 WhatsApp
            </button>

            <button
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
