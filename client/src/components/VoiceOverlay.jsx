import { useState, useEffect } from 'react';
import { Mic, X, StopCircle, RotateCcw, Check } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';
import { parseVoiceEntry } from '../services/voiceParser';
import { api } from '../services/api';

export default function VoiceOverlay({ shop, onClose, onComplete }) {
  const {
    state,
    transcript,
    interimText,
    error,
    isSupported,
    startListening,
    stopListening,
    reset
  } = useSpeech();

  const [stage, setStage] = useState('listening'); // listening, confirming, saving
  const [parsed, setParsed] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Manual entry fields
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  // Auto-start listening
  useEffect(() => {
    if (isSupported && stage === 'listening') {
      startListening();
    }
  }, [isSupported, stage, startListening]);

  // When transcript is final, parse and move to confirmation
  useEffect(() => {
    if (transcript && state === 'idle' && stage === 'listening') {
      const result = parseVoiceEntry(transcript);

      if (result) {
        setParsed(result);
        setProductName(result.product);
        setQuantity(result.quantity.toString());
        setUnitPrice(result.price.toString());
        setStage('confirming');
      } else {
        // Parsing failed - switch to manual
        setManualMode(true);
        setStage('confirming');
        setSaveError('Could not understand. Please enter manually.');
      }
    }
  }, [transcript, state, stage]);

  async function handleConfirm() {
    try {
      setStage('saving');
      setSaveError('');

      const qty = parseFloat(quantity);
      const price = parseFloat(unitPrice);
      const total = qty * price;

      await api.createQuickSalesEntry({
        shop_id: shop.id,
        business_date: new Date().toISOString().split('T')[0],
        input_method: 'voice',
        items: [{
          product_name: productName,
          quantity: qty,
          unit_price: price,
          line_total: total
        }]
      });

      // Success!
      onComplete();
      onClose();
    } catch (err) {
      setSaveError('Failed to save: ' + err.message);
      setStage('confirming');
    }
  }

  function handleRetry() {
    reset();
    setParsed(null);
    setManualMode(false);
    setSaveError('');
    setProductName('');
    setQuantity('');
    setUnitPrice('');
    setStage('listening');
  }

  function handleCancel() {
    onClose();
  }

  const total = quantity && unitPrice
    ? (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2)
    : '0.00';

  const canConfirm = productName && quantity && unitPrice && parseFloat(quantity) > 0 && parseFloat(unitPrice) > 0;

  return (
    <div className="overlay-backdrop" onClick={handleCancel}>
      <div className="overlay-content voice-overlay" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="overlay-header">
          <h2 className="overlay-title">
            <Mic size={24} />
            Voice Entry - {shop.name}
          </h2>
          <button className="btn-close" onClick={handleCancel}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="overlay-body">
          {stage === 'listening' && (
            <>
              {state === 'listening' && (
                <div className="listening-animation">
                  <div className="pulse-ring"></div>
                  <div className="pulse-ring pulse-delay-1"></div>
                  <div className="pulse-ring pulse-delay-2"></div>
                  <div className="mic-icon-large">
                    <Mic size={48} />
                  </div>
                </div>
              )}

              <h3 className="voice-status">
                {state === 'listening' ? '● LISTENING...' : '○ Ready'}
              </h3>

              <div className="voice-instructions">
                <p className="instruction-text">Say: Product, Quantity, Price</p>
                <div className="instruction-examples">
                  <p className="example-text">"Rice bag, 2, 1250"</p>
                  <p className="example-text">"Sugar 5 kg, 45"</p>
                </div>
              </div>

              {(interimText || transcript) && (
                <div className="transcript-box">
                  <p className="transcript-label">You said:</p>
                  <p className="transcript-text">{interimText || transcript}</p>
                </div>
              )}

              {error && (
                <div className="error-message">{error}</div>
              )}

              <div className="voice-actions">
                {state === 'listening' && (
                  <button className="btn btn-danger btn-large" onClick={stopListening}>
                    <StopCircle size={20} />
                    Stop Recording
                  </button>
                )}
                <button className="btn btn-secondary btn-large" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {stage === 'confirming' && (
            <>
              {!manualMode && parsed ? (
                <div className="confirmation-view">
                  <div className="confirm-field">
                    <label>Product</label>
                    <div className="field-value">{parsed.product}</div>
                  </div>
                  <div className="confirm-field">
                    <label>Quantity</label>
                    <div className="field-value">{parsed.quantity}</div>
                  </div>
                  <div className="confirm-field">
                    <label>Unit Price</label>
                    <div className="field-value">₹{parsed.price}</div>
                  </div>
                  <div className="confirm-field total-field">
                    <label>Total</label>
                    <div className="field-value total-value">
                      ₹{(parsed.quantity * parsed.price).toFixed(2)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="manual-entry-form">
                  {manualMode && (
                    <p className="manual-note">Please enter details manually</p>
                  )}

                  <div className="form-field">
                    <label>Product Name</label>
                    <input
                      type="text"
                      className="input-text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g. Rice Bag"
                      autoFocus
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input-text"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="e.g. 2"
                      />
                    </div>

                    <div className="form-field">
                      <label>Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input-text"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        placeholder="e.g. 1250"
                      />
                    </div>
                  </div>

                  <div className="confirm-field total-field">
                    <label>Total</label>
                    <div className="field-value total-value">₹{total}</div>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="error-message">{saveError}</div>
              )}

              <div className="confirm-actions">
                <button
                  className="btn btn-success btn-large"
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                >
                  <Check size={20} />
                  Confirm & Save
                </button>
                {!manualMode && (
                  <button className="btn btn-secondary btn-large" onClick={handleRetry}>
                    <RotateCcw size={20} />
                    Try Again
                  </button>
                )}
                <button className="btn btn-secondary btn-large" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {stage === 'saving' && (
            <div className="saving-state">
              <div className="loading-spinner"></div>
              <p>Saving entry...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
