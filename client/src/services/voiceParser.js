/**
 * Voice Entry Parser
 *
 * Parses voice input like:
 * - "Rice bag 2 1250"
 * - "Sugar, 5, 45"
 * - "2 oil bottles at 180"
 *
 * Returns: { product, quantity, price } or null
 */

export function parseVoiceEntry(transcript) {
  if (!transcript) return null;

  // Clean and normalize input
  const text = transcript
    .toLowerCase()
    .trim()
    .replace(/rupees?/gi, '')
    .replace(/rs\.?/gi, '')
    .replace(/₹/g, '')
    .replace(/\s+/g, ' ');

  // Try multiple patterns
  const patterns = [
    // Pattern 1: "product quantity price" (e.g., "rice bag 2 1250")
    {
      regex: /^(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$/,
      extract: (match) => ({
        product: match[1].trim(),
        quantity: parseFloat(match[2]),
        price: parseFloat(match[3])
      })
    },

    // Pattern 2: "product, quantity, price" (e.g., "rice bag, 2, 1250")
    {
      regex: /^(.+?),\s*(\d+\.?\d*),\s*(\d+\.?\d*)$/,
      extract: (match) => ({
        product: match[1].trim(),
        quantity: parseFloat(match[2]),
        price: parseFloat(match[3])
      })
    },

    // Pattern 3: "quantity product at/for price" (e.g., "2 rice bags at 1250")
    {
      regex: /^(\d+\.?\d*)\s+(.+?)\s+(?:at|for|@)\s+(\d+\.?\d*)$/,
      extract: (match) => ({
        product: match[2].trim(),
        quantity: parseFloat(match[1]),
        price: parseFloat(match[3])
      })
    },

    // Pattern 4: "product quantity units price" (e.g., "sugar 5 kg 45")
    {
      regex: /^(.+?)\s+(\d+\.?\d*)\s+(?:kg|kgs|litre|litres|l|bag|bags|piece|pieces|pcs)\s+(\d+\.?\d*)$/,
      extract: (match) => ({
        product: match[1].trim(),
        quantity: parseFloat(match[2]),
        price: parseFloat(match[3])
      })
    },

    // Pattern 5: "product quantity units at price" (e.g., "sugar 5 kg at 45")
    {
      regex: /^(.+?)\s+(\d+\.?\d*)\s+(?:kg|kgs|litre|litres|l|bag|bags|piece|pieces|pcs)\s+(?:at|for|@)\s+(\d+\.?\d*)$/,
      extract: (match) => ({
        product: match[1].trim(),
        quantity: parseFloat(match[2]),
        price: parseFloat(match[3])
      })
    },

    // Pattern 6: "quantity units product price" (e.g., "5 kg sugar 45")
    {
      regex: /^(\d+\.?\d*)\s+(?:kg|kgs|litre|litres|l|bag|bags|piece|pieces|pcs)\s+(.+?)\s+(\d+\.?\d*)$/,
      extract: (match) => ({
        product: match[2].trim(),
        quantity: parseFloat(match[1]),
        price: parseFloat(match[3])
      })
    }
  ];

  // Try each pattern
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const result = pattern.extract(match);

      // Validate result
      if (isValidEntry(result)) {
        return result;
      }
    }
  }

  // No pattern matched
  return null;
}

function isValidEntry(entry) {
  if (!entry) return false;

  const { product, quantity, price } = entry;

  // Product name should be reasonable
  if (!product || product.length < 2 || product.length > 100) {
    return false;
  }

  // Quantity should be positive and reasonable
  if (isNaN(quantity) || quantity <= 0 || quantity > 10000) {
    return false;
  }

  // Price should be positive and reasonable
  if (isNaN(price) || price <= 0 || price > 1000000) {
    return false;
  }

  return true;
}

/**
 * Format parsed entry for display
 */
export function formatEntry(entry) {
  if (!entry) return '';

  return `${entry.product} - ${entry.quantity} × ₹${entry.price} = ₹${(entry.quantity * entry.price).toFixed(2)}`;
}

/**
 * Test the parser with sample inputs
 */
export function testParser() {
  const testCases = [
    "rice bag 2 1250",
    "Rice Bag, 2, 1250",
    "2 rice bags at 1250",
    "sugar 5 kg 45",
    "sugar 5 kg at 45 rupees",
    "5 kg sugar 45",
    "oil 1 180",
    "dal, 3, 120"
  ];

  console.log('Voice Parser Tests:');
  testCases.forEach(input => {
    const result = parseVoiceEntry(input);
    console.log(`Input: "${input}"`);
    console.log(`Result:`, result);
    console.log('---');
  });
}
