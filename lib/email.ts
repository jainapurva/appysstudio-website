import nodemailer from 'nodemailer';

const emailEnabled = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

let _transporter: nodemailer.Transporter;
function getTransporter() {
  if (!emailEnabled) return null;
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return _transporter;
}

async function safeSendMail(mailOptions: nodemailer.SendMailOptions) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('[email] Skipped (GMAIL credentials not configured):', mailOptions.subject);
    return;
  }
  await transporter.sendMail(mailOptions);
}

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'appysstudioca@gmail.com';
const FROM_EMAIL = process.env.GMAIL_USER || 'apurvajain.kota@gmail.com';

export async function sendOrderConfirmationToCustomer(order: {
  customerName: string;
  customerEmail: string;
  items: Array<{ productName: string; quantity: number; price: number }>;
  totalAmount: number;
  orderId: string;
}) {
  const itemsHtml = order.items
    .map(i => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f1f1">${i.productName}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f1f1;text-align:center">${i.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f1f1;text-align:right">$${(i.price * i.quantity).toFixed(2)}</td>
      </tr>`)
    .join('');

  await safeSendMail({
    from: `Appy's Studio <${FROM_EMAIL}>`,
    to: order.customerEmail,
    subject: `Order Confirmed — ${order.orderId}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <div style="background:#f97316;padding:32px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:24px">🖨️ Order Confirmed!</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p style="margin-top:0">Hi <strong>${order.customerName}</strong>,</p>
          <p>Your order has been confirmed and we're getting started on printing! Here's your summary:</p>

          <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0">
            <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Order ID</p>
            <p style="margin:0;font-weight:600;font-family:monospace">${order.orderId}</p>
          </div>

          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:2px solid #e5e7eb">
                <th style="text-align:left;padding-bottom:8px;font-size:13px;color:#6b7280">Product</th>
                <th style="text-align:center;padding-bottom:8px;font-size:13px;color:#6b7280">Qty</th>
                <th style="text-align:right;padding-bottom:8px;font-size:13px;color:#6b7280">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding-top:12px;font-weight:700">Total</td>
                <td style="padding-top:12px;font-weight:700;text-align:right">$${order.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="background:#fef3c7;border-left:4px solid #f97316;padding:16px;margin:24px 0;border-radius:0 8px 8px 0">
            <p style="margin:0;font-size:14px"><strong>What happens next?</strong><br>
            We'll start printing your order and ship it within the lead time. You'll get a shipping notification once it's on the way.</p>
          </div>

          <p style="font-size:14px;color:#6b7280">Questions? Reply to this email or reach us at <a href="mailto:${OWNER_EMAIL}" style="color:#f97316">${OWNER_EMAIL}</a></p>
          <p style="font-size:14px;color:#6b7280;margin-bottom:0">— The Appy's Studio Team</p>
        </div>
      </div>
    `,
  });
}

export async function sendNewOrderNotificationToOwner(order: {
  customerName: string;
  customerEmail: string;
  items: Array<{ productName: string; quantity: number; price: number }>;
  totalAmount: number;
  orderId: string;
  shippingAddress?: string;
}) {
  const itemsList = order.items
    .map(i => `• ${i.productName} × ${i.quantity} = $${(i.price * i.quantity).toFixed(2)}`)
    .join('\n');

  await safeSendMail({
    from: `Appy's Studio <${FROM_EMAIL}>`,
    to: OWNER_EMAIL,
    subject: `🛒 New Order: ${order.orderId} — $${order.totalAmount.toFixed(2)}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <div style="background:#1f2937;padding:24px 32px;border-radius:12px 12px 0 0">
          <h2 style="color:white;margin:0;font-size:20px">New Order Received 🎉</h2>
          <p style="color:#9ca3af;margin:4px 0 0;font-size:14px">${order.orderId}</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
            <div style="background:#f9fafb;padding:16px;border-radius:8px">
              <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase">Customer</p>
              <p style="margin:0;font-weight:600">${order.customerName}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280">${order.customerEmail}</p>
            </div>
            <div style="background:#f9fafb;padding:16px;border-radius:8px">
              <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase">Total</p>
              <p style="margin:0;font-weight:700;font-size:22px;color:#f97316">$${order.totalAmount.toFixed(2)}</p>
            </div>
          </div>

          <h4 style="margin:0 0 12px;color:#374151">Items Ordered:</h4>
          <pre style="background:#f9fafb;padding:16px;border-radius:8px;font-size:13px;line-height:1.8;margin:0">${itemsList}</pre>

          ${order.shippingAddress ? `<p style="margin-top:20px;font-size:14px"><strong>Ship to:</strong> ${order.shippingAddress}</p>` : ''}
        </div>
      </div>
    `,
  });
}

export async function sendQuoteRequestNotificationToOwner(quote: {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  fileName: string;
  material: string;
  color: string;
  quantity: number;
  notes: string;
}) {
  await safeSendMail({
    from: `Appy's Studio <${FROM_EMAIL}>`,
    to: OWNER_EMAIL,
    subject: `📐 New Quote Request: ${quote.id} from ${quote.customerName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <div style="background:#1d4ed8;padding:24px 32px;border-radius:12px 12px 0 0">
          <h2 style="color:white;margin:0;font-size:20px">New Custom Print Quote Request</h2>
          <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px">${quote.id}</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <table style="width:100%;border-collapse:collapse">
            ${[
              ['Customer', quote.customerName],
              ['Email', quote.customerEmail],
              ['Phone', quote.customerPhone || '—'],
              ['File', quote.fileName],
              ['Material', quote.material],
              ['Color', quote.color],
              ['Quantity', String(quote.quantity)],
            ].map(([label, value]) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:100px">${label}</td>
                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:500">${value}</td>
              </tr>
            `).join('')}
          </table>
          ${quote.notes ? `
          <div style="margin-top:20px">
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Notes</p>
            <p style="background:#f9fafb;padding:14px;border-radius:8px;margin:0;font-size:14px;line-height:1.6">${quote.notes}</p>
          </div>` : ''}
          <p style="margin-top:24px;font-size:13px;color:#6b7280">Reply to <strong>${quote.customerEmail}</strong> with your quote and lead time.</p>
        </div>
      </div>
    `,
  });
}

export async function sendQuoteAcknowledgementToCustomer(quote: {
  customerName: string;
  customerEmail: string;
  id: string;
}) {
  await safeSendMail({
    from: `Appy's Studio <${FROM_EMAIL}>`,
    to: quote.customerEmail,
    subject: `Quote Request Received — ${quote.id}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <div style="background:#1d4ed8;padding:32px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">📐 Quote Request Received!</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p style="margin-top:0">Hi <strong>${quote.customerName}</strong>,</p>
          <p>We've received your custom print request (<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${quote.id}</code>) and will review your file shortly.</p>
          <div style="background:#eff6ff;border-left:4px solid #1d4ed8;padding:16px;margin:24px 0;border-radius:0 8px 8px 0">
            <p style="margin:0;font-size:14px"><strong>What happens next?</strong><br>
            We'll review your file, check printability, and send you a price quote + lead time estimate — typically within 24 hours.</p>
          </div>
          <p style="font-size:14px;color:#6b7280">In the meantime, feel free to browse our <a href="${process.env.NEXT_PUBLIC_BASE_URL}/shop" style="color:#f97316">ready-made products</a>.</p>
          <p style="font-size:14px;color:#6b7280;margin-bottom:0">— The Appy's Studio Team</p>
        </div>
      </div>
    `,
  });
}
