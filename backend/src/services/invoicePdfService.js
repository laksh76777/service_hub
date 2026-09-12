const PDFDocument = require('pdfkit');

/**
 * Generates a professional Indian GST-compatible Invoice PDF stream
 *
 * @param {Object} invoice - Populated Invoice document with customerId, providerId, bookingId
 * @param {WritableStream} outputStream - Express response or writable stream
 */
const generateInvoicePdf = (invoice, outputStream) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });

      doc.on('error', (err) => reject(err));
      doc.on('end', () => resolve());

      doc.pipe(outputStream);

      const customer = invoice.customerId || {};
      const provider = invoice.providerId || {};
      const booking = invoice.bookingId || {};
      const address = booking.address || {};

      // 1. Header & Brand Banner
      doc
        .fillColor('#1e40af')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('ServiceHub', 40, 40);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('Local Service Booking & Work Verification Platform', 40, 66)
        .text('Bengaluru, Karnataka, India | support@servicehub.demo', 40, 78);

      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('TAX INVOICE', 400, 40, { align: 'right' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155')
        .text(`Invoice No: ${invoice.invoiceNumber}`, 400, 66, { align: 'right' })
        .text(`Date: ${new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString('en-IN')}`, 400, 80, { align: 'right' })
        .text(`Status: ${invoice.status}`, 400, 94, { align: 'right' });

      // Horizontal Divider
      doc
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .moveTo(40, 115)
        .lineTo(555, 115)
        .stroke();

      // 2. Bill To & Service Provider Columns
      const startY = 128;

      // Left Column: Customer
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#475569')
        .text('BILLED TO (CUSTOMER):', 40, startY);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(customer.name || 'Valued Customer', 40, startY + 16);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text(`Phone: ${customer.phone || 'N/A'}`, 40, startY + 30)
        .text(`Email: ${customer.email || 'N/A'}`, 40, startY + 42)
        .text(
          `Site Address: ${address.addressLine1 || address.streetAddress || ''}${
            address.locality ? ', ' + address.locality : ''
          }`,
          40,
          startY + 54,
          { width: 230 }
        )
        .text(
          `${address.city || ''}, ${address.state || ''} - ${address.pincode || address.zipCode || ''}`,
          40,
          startY + 76
        );

      // Right Column: Service Provider
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#475569')
        .text('SERVICE PROVIDER / CONTRACTOR:', 320, startY);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(provider.name || 'Verified Service Technician', 320, startY + 16);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text(`Phone: ${provider.phone || 'N/A'}`, 320, startY + 30)
        .text(`Email: ${provider.email || 'N/A'}`, 320, startY + 42)
        .text(`Booking Ref: ${booking.bookingNumber || 'N/A'}`, 320, startY + 54)
        .text(`GST Status: Registered Taxable Person`, 320, startY + 66);

      // 3. Line Items Table
      const tableTop = 230;

      // Table Header Background
      doc
        .rect(40, tableTop, 515, 22)
        .fill('#f1f5f9');

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#1e293b')
        .text('#', 48, tableTop + 6)
        .text('Item Description', 75, tableTop + 6)
        .text('Type', 315, tableTop + 6)
        .text('Qty', 375, tableTop + 6, { align: 'center', width: 35 })
        .text('Rate (INR)', 415, tableTop + 6, { align: 'right', width: 55 })
        .text('Amount (INR)', 480, tableTop + 6, { align: 'right', width: 65 });

      let currentY = tableTop + 28;
      const items = invoice.items || [];

      items.forEach((item, index) => {
        const itemBg = index % 2 === 1 ? '#f8fafc' : '#ffffff';
        doc.rect(40, currentY - 4, 515, 20).fill(itemBg);

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#1e293b')
          .text(`${index + 1}`, 48, currentY)
          .text(`${item.description}${item.isAdditionalWork ? ' (Additional Scope)' : ''}`, 75, currentY, { width: 230, lineBreak: false })
          .text(`${item.type || 'SERVICE'}`, 315, currentY)
          .text(`${item.quantity || 1}`, 375, currentY, { align: 'center', width: 35 })
          .text(`Rs. ${Number(item.unitPrice || 0).toLocaleString('en-IN')}`, 415, currentY, { align: 'right', width: 55 })
          .text(`Rs. ${Number(item.amount || 0).toLocaleString('en-IN')}`, 480, currentY, { align: 'right', width: 65 });

        currentY += 20;
      });

      // Horizontal line after items
      doc
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .moveTo(40, currentY + 5)
        .lineTo(555, currentY + 5)
        .stroke();

      // 4. Financial Summary Breakdown
      const summaryY = currentY + 18;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text('Subtotal:', 350, summaryY)
        .text(`Rs. ${Number(invoice.subtotal || 0).toLocaleString('en-IN')}`, 450, summaryY, { align: 'right', width: 95 });

      doc
        .text('Taxes & GST (18%):', 350, summaryY + 16)
        .text(`Rs. ${Number(invoice.tax || invoice.taxes || 0).toLocaleString('en-IN')}`, 450, summaryY + 16, { align: 'right', width: 95 });

      if (invoice.discount > 0) {
        doc
          .text('Discount:', 350, summaryY + 32)
          .text(`-Rs. ${Number(invoice.discount).toLocaleString('en-IN')}`, 450, summaryY + 32, { align: 'right', width: 95 });
      }

      const totalY = summaryY + (invoice.discount > 0 ? 48 : 32);

      // Total Box
      doc
        .rect(340, totalY - 4, 215, 26)
        .fill('#1e40af');

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('Total Payable:', 350, totalY + 3)
        .text(`Rs. ${Number(invoice.total || 0).toLocaleString('en-IN')}`, 450, totalY + 3, { align: 'right', width: 95 });

      // Balance & Payment Summary
      const balanceY = totalY + 32;
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#475569')
        .text('Amount Paid:', 350, balanceY)
        .text(`Rs. ${Number(invoice.paidAmount || 0).toLocaleString('en-IN')}`, 450, balanceY, { align: 'right', width: 95 });

      doc
        .text('Balance Due:', 350, balanceY + 16)
        .fillColor(invoice.remainingAmount > 0 ? '#b91c1c' : '#15803d')
        .text(`Rs. ${Number(invoice.remainingAmount || 0).toLocaleString('en-IN')}`, 450, balanceY + 16, { align: 'right', width: 95 });

      // 5. Notes & Verification Seal
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('Notes & Terms:', 40, summaryY)
        .text('• This tax invoice is computer-generated upon customer work verification.', 40, summaryY + 14)
        .text('• Service covered under standard ServiceHub satisfaction & verification policy.', 40, summaryY + 26)
        .text('• All rates are quoted in Indian Rupees (INR) and include applicable taxes.', 40, summaryY + 38);

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text(
          'ServiceHub India Platform — Safe, Verified Home & Local Services',
          40,
          760,
          { align: 'center', width: 515 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateInvoicePdf
};
