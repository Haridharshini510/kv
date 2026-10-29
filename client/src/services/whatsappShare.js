/**
 * WhatsApp Share Service
 *
 * Shares bill via WhatsApp using Web Share API or URL scheme
 */

export async function shareViaWhatsApp(billData) {
  const { shop, date, items, total } = billData;

  // Generate text invoice
  const invoiceText = formatInvoiceText(shop, date, items, total);

  // Try Web Share API first (works on mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Invoice - ${shop.name}`,
        text: invoiceText
      });
      return;
    } catch (err) {
      // User cancelled or share failed, fallback to URL scheme
      console.log('Web Share failed, using URL scheme');
    }
  }

  // Fallback: WhatsApp URL scheme
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(invoiceText)}`;
  window.open(whatsappUrl, '_blank');
}

function formatInvoiceText(shop, date, items, total) {
  let text = `*INVOICE*\n\n`;
  text += `*${shop.name}*\n`;

  if (shop.phone) {
    text += `Phone: ${shop.phone}\n`;
  }

  if (shop.address) {
    text += `Address: ${shop.address}\n`;
  }

  text += `Date: ${date}\n\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Items
  items.forEach((item, index) => {
    text += `${index + 1}. *${item.product_name}*\n`;
    text += `   ${item.quantity} × ₹${item.unit_price.toFixed(2)} = ₹${item.line_total.toFixed(2)}\n\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `*Grand Total: ₹${total.toFixed(2)}*\n\n`;
  text += `Thank you for your business!`;

  return text;
}

/**
 * Share with phone number pre-filled
 */
export async function shareToContact(billData, phoneNumber) {
  const { shop, date, items, total } = billData;
  const invoiceText = formatInvoiceText(shop, date, items, total);

  // Remove + and spaces from phone number
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(invoiceText)}`;
  window.open(whatsappUrl, '_blank');
}
