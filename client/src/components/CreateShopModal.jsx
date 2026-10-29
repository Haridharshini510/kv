import { useState } from 'react';
import { Store, X, Check } from 'lucide-react';
import { api } from '../services/api';

export default function CreateShopModal({ onClose, onShopCreated }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Shop name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await api.createShop({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined
      });

      onShopCreated();
    } catch (err) {
      setError('Failed to create shop: ' + err.message);
      setSaving(false);
    }
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-content create-shop-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="overlay-header">
          <h2 className="overlay-title">
            <Store size={24} />
            Create New Shop
          </h2>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form className="overlay-body" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="shop-name">
              Shop Name <span className="required">*</span>
            </label>
            <input
              id="shop-name"
              type="text"
              className="input-text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kumar Stores"
              autoFocus
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="shop-phone">Phone Number</label>
            <input
              id="shop-phone"
              type="tel"
              className="input-text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
            />
          </div>

          <div className="form-field">
            <label htmlFor="shop-address">Address</label>
            <textarea
              id="shop-address"
              className="input-textarea"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Main Road, Chennai"
              rows="3"
            />
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="modal-actions">
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={saving || !name.trim()}
            >
              <Check size={20} />
              {saving ? 'Creating...' : 'Create Shop'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-large"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
