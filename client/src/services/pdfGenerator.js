/**
 * PDF Generator Service
 *
 * Generates PDF bills using browser print or jsPDF library
 */

export async function generatePDF(billData) {
  const { shop, date, items, total } = billData;

  // Option 1: Use browser print (simple, works everywhere)
  // User can "Save as PDF" from the print dialog
  window.print();

  // Option 2: Generate actual PDF with jsPDF (requires library)
  // Uncomment below if you install jsPDF
  /*
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('INVOICE', 105, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.text(shop.name, 105, 30, { align: 'center' });

  if (shop.phone) {
    doc.setFontSize(10);
    doc.text(`Phone: ${shop.phone}`, 105, 36, { align: 'center' });
  }

  if (shop.address) {
    doc.setFontSize(10);
    doc.text(shop.address, 105, 42, { align: 'center' });
  }

  doc.setFontSize(10);
  doc.text(`Date: ${date}`, 105, 48, { align: 'center' });

  // Table
  let y = 60;
  doc.setFontSize(10);
  doc.text('Sr.', 15, y);
  doc.text('Product', 30, y);
  doc.text('Qty', 120, y);
  doc.text('Price', 145, y);
  doc.text('Total', 175, y);

  y += 7;

  items.forEach((item, index) => {
    doc.text(`${index + 1}`, 15, y);
    doc.text(item.product_name, 30, y);
    doc.text(item.quantity.toString(), 120, y);
    doc.text(`₹${item.unit_price.toFixed(2)}`, 145, y);
    doc.text(`₹${item.line_total.toFixed(2)}`, 175, y);
    y += 7;
  });

  // Total
  y += 10;
  doc.setFontSize(12);
  doc.text('Grand Total:', 145, y);
  doc.text(`₹${total.toFixed(2)}`, 175, y);

  // Footer
  y += 15;
  doc.setFontSize(10);
  doc.text('Thank you for your business!', 105, y, { align: 'center' });

  // Download
  doc.save(`${shop.name}-${date}.pdf`);
  */
}

/**
 * Alternative: Generate PDF on server
 */
export async function generateServerPDF(billData) {
  // TODO: Implement server-side PDF generation
  // POST billData to /api/v1/invoices/generate-pdf
  // Return blob URL or download link

  throw new Error('Server PDF generation not implemented yet');
}
