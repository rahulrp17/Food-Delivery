import { formatDate, formatINR } from './format';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatStatus = (value) =>
  String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildInvoiceHtml = (order, settings = {}) => {
  const pricing = order.pricing || {};
  const address = order.addressSnapshot || {};
  const items = order.items || [];
  const businessName = settings.invoiceLegalName || settings.name || 'Foodie';
  const taxLabel = settings.taxLabel || 'Tax';

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="num">${Number(item.quantity) || 0}</td>
          <td class="num">${escapeHtml(formatINR(item.unitPricePaise))}</td>
          <td class="num">${escapeHtml(formatINR(item.lineTotalPaise))}</td>
        </tr>`
    )
    .join('');

  const discountRow =
    Number(pricing.discountPaise) > 0
      ? `<tr><td colspan="3">Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''}</td><td class="num">-${escapeHtml(formatINR(pricing.discountPaise))}</td></tr>`
      : '';

  const taxRate = pricing.taxRateBps ? (pricing.taxRateBps / 100).toFixed(1) : '0';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${escapeHtml(order.orderNumber)}</title>
    <style>
      @page { margin: 16mm; }
      * { box-sizing: border-box; }
      body { font-family: Inter, Arial, sans-serif; color: #201a17; margin: 0; font-size: 13px; }
      .brand { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #e4482e; padding-bottom: 14px; }
      .brand h1 { margin: 0; font-size: 24px; letter-spacing: -0.02em; }
      .brand p { margin: 2px 0 0; color: #827a73; }
      .meta { text-align: right; color: #827a73; line-height: 1.6; }
      .meta strong { color: #201a17; font-size: 15px; }
      .grid { display: flex; gap: 24px; margin: 22px 0; }
      .panel { flex: 1; background: #faf7f2; border: 1px solid #eae3da; border-radius: 10px; padding: 14px 16px; }
      .panel h2 { margin: 0 0 8px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #827a73; }
      .panel p { margin: 2px 0; line-height: 1.5; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { text-align: left; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #827a73; border-bottom: 1px solid #eae3da; padding: 8px; }
      td { padding: 8px; border-bottom: 1px solid #f0eae2; vertical-align: top; }
      .num { text-align: right; white-space: nowrap; }
      .totals { width: 300px; margin-left: auto; margin-top: 12px; }
      .totals td { border: 0; padding: 5px 8px; }
      .totals .grand td { border-top: 1px solid #eae3da; font-weight: 700; font-size: 15px; padding-top: 10px; }
      .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eae3da; color: #827a73; font-size: 11px; display: flex; justify-content: space-between; gap: 16px; }
    </style>
  </head>
  <body>
    <header class="brand">
      <div>
        <h1>${escapeHtml(businessName)}</h1>
        <p>Kitchen &amp; delivery invoice</p>
        ${settings.invoiceGstin ? `<p>GSTIN: ${escapeHtml(settings.invoiceGstin)}</p>` : ''}
      </div>
      <div class="meta">
        <strong>${escapeHtml(order.orderNumber)}</strong><br />
        ${escapeHtml(formatDate(order.placedAt))}<br />
        Status: ${escapeHtml(formatStatus(order.status))}<br />
        Payment: ${escapeHtml(formatStatus(order.paymentStatus))}
      </div>
    </header>

    <section class="grid">
      <div class="panel">
        <h2>Customer</h2>
        <p>${escapeHtml(order.customer?.name || address.recipientName || 'Guest')}</p>
        <p>${escapeHtml(order.customer?.email || '')}</p>
        <p>${escapeHtml(order.customer?.phone || address.phone || '')}</p>
      </div>
      <div class="panel">
        <h2>Delivery address</h2>
        <p>${escapeHtml(address.recipientName || '')}</p>
        <p>${escapeHtml([address.line1, address.line2].filter(Boolean).join(', '))}</p>
        <p>${escapeHtml([address.city, address.state, address.pincode].filter(Boolean).join(', '))}</p>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Unit price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <table class="totals">
      <tr><td>Subtotal</td><td class="num">${escapeHtml(formatINR(pricing.subtotalPaise))}</td></tr>
      ${discountRow}
      <tr><td>Delivery fee</td><td class="num">${escapeHtml(formatINR(pricing.deliveryFeePaise))}</td></tr>
      <tr><td>${escapeHtml(taxLabel)} (${escapeHtml(taxRate)}%)</td><td class="num">${escapeHtml(formatINR(pricing.taxPaise))}</td></tr>
      <tr class="grand"><td>Total</td><td class="num">${escapeHtml(formatINR(pricing.totalPaise))}</td></tr>
    </table>

    <footer class="footer">
      <span>
        ${settings.invoiceFooter ? escapeHtml(settings.invoiceFooter) : 'Thank you for ordering with Foodie.'}
        ${settings.invoiceAddress ? `<br />${escapeHtml(settings.invoiceAddress)}` : ''}
      </span>
      <span>${escapeHtml(order.orderNumber)}</span>
    </footer>
  </body>
</html>`;
};

export const printOrderInvoice = (order, settings = {}) => {
  if (!order || typeof window === 'undefined' || typeof document === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }

  const cleanup = () => iframe.remove();

  doc.open();
  doc.write(buildInvoiceHtml(order, settings));
  doc.close();

  window.setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      window.setTimeout(cleanup, 1500);
    }
  }, 150);
};
