import nodemailer from 'nodemailer';
import { WORKSHOP, VENUE_ONE_LINE } from './workshop';

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

interface WorkshopRegistrationEmail {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  seats: number;
  attendeeNames?: string;
  experience?: string;
  notes?: string;
  amountPaid: number;
}

export async function sendWorkshopConfirmationToCustomer(reg: WorkshopRegistrationEmail) {
  const seatLabel = `${reg.seats} seat${reg.seats === 1 ? '' : 's'}`;

  await safeSendMail({
    from: `Appy's Studio <${FROM_EMAIL}>`,
    to: reg.customerEmail,
    subject: `You're registered — ${WORKSHOP.title}, ${WORKSHOP.date}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <div style="background:#7c3aed;padding:32px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:24px">🎉 You're registered!</h1>
          <p style="color:#ddd6fe;margin:8px 0 0;font-size:15px">${WORKSHOP.title}</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p style="margin-top:0">Hi <strong>${reg.customerName}</strong>,</p>
          <p>Your spot is confirmed. Here are the details — we'd suggest adding them to your calendar now.</p>

          <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;margin:20px 0">
            ${[
              ['When', `${WORKSHOP.date}<br>${WORKSHOP.startTime} – ${WORKSHOP.endTime} (${WORKSHOP.durationHours} hours)`],
              ['Where', `${WORKSHOP.venue.name}<br>${VENUE_ONE_LINE}`],
              ['Seats', seatLabel],
              ['Paid', `$${reg.amountPaid.toFixed(2)}`],
              ['Reference', `<code style="font-family:monospace">${reg.id}</code>`],
            ].map(([label, value]) => `
              <tr>
                <td style="padding:12px 16px;color:#6b7280;font-size:13px;width:90px;vertical-align:top">${label}</td>
                <td style="padding:12px 16px;font-weight:500;font-size:14px">${value}</td>
              </tr>
            `).join('')}
          </table>

          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin:24px 0;border-radius:0 8px 8px 0">
            <p style="margin:0 0 8px;font-size:14px"><strong>⚠️ Please bring a laptop</strong></p>
            <p style="margin:0;font-size:14px;line-height:1.6">This is a hands-on session and you'll be designing on your own machine, so you can keep everything you make. Any Mac, Windows laptop, or Chromebook that runs a modern browser is fine.${reg.seats > 1 ? ` You've booked ${seatLabel} — <strong>each attendee needs their own laptop.</strong>` : ''}</p>
          </div>

          <p style="font-size:14px;line-height:1.7"><strong>Everything else is on us.</strong> Printers, filament, software, and materials are all provided. No experience needed — come as you are.</p>

          <p style="font-size:14px;line-height:1.7">You'll leave with a 3D printed object that you designed during the session.</p>

          <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:24px 0">
            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
              <strong style="color:#374151">Need to cancel?</strong> Email us at least 7 days before the workshop for a full refund. Inside 7 days we can't refund, but you're welcome to send someone else in your place.
            </p>
          </div>

          <p style="font-size:14px;color:#6b7280">Questions? Just reply to this email, or reach us at <a href="mailto:${OWNER_EMAIL}" style="color:#7c3aed">${OWNER_EMAIL}</a></p>
          <p style="font-size:14px;color:#6b7280;margin-bottom:0">See you on the 22nd!<br>— The Appy's Studio Team</p>
        </div>
      </div>
    `,
  });
}

export async function sendWorkshopRegistrationToOwner(reg: WorkshopRegistrationEmail) {
  await safeSendMail({
    from: `Appy's Studio <${FROM_EMAIL}>`,
    to: OWNER_EMAIL,
    subject: `🎓 Workshop registration: ${reg.customerName} — ${reg.seats} seat${reg.seats === 1 ? '' : 's'} ($${reg.amountPaid.toFixed(2)})`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <div style="background:#1f2937;padding:24px 32px;border-radius:12px 12px 0 0">
          <h2 style="color:white;margin:0;font-size:20px">New Workshop Registration 🎓</h2>
          <p style="color:#9ca3af;margin:4px 0 0;font-size:14px">${reg.id} · ${WORKSHOP.date}</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <table style="width:100%;border-collapse:collapse">
            ${[
              ['Name', reg.customerName],
              ['Email', reg.customerEmail],
              ['Phone', reg.customerPhone || '—'],
              ['Seats', String(reg.seats)],
              ['Paid', `$${reg.amountPaid.toFixed(2)}`],
              ['Attendees', reg.attendeeNames || '—'],
              ['Experience', reg.experience || '—'],
            ].map(([label, value]) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:100px">${label}</td>
                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:500">${value}</td>
              </tr>
            `).join('')}
          </table>
          ${reg.notes ? `
          <div style="margin-top:20px">
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Notes</p>
            <p style="background:#f9fafb;padding:14px;border-radius:8px;margin:0;font-size:14px;line-height:1.6">${reg.notes}</p>
          </div>` : ''}
        </div>
      </div>
    `,
  });
}

export async function sendWorkshopRegistrationPendingToOwner(reg: WorkshopRegistrationEmail) {
  await safeSendMail({
    from: `Appy's Studio <${FROM_EMAIL}>`,
    to: OWNER_EMAIL,
    subject: `⏳ Workshop registration awaiting payment: ${reg.customerName} (${reg.seats} seat${reg.seats === 1 ? '' : 's'})`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <div style="background:#b45309;padding:24px 32px;border-radius:12px 12px 0 0">
          <h2 style="color:white;margin:0;font-size:20px">Workshop Registration — Payment Pending</h2>
          <p style="color:#fde68a;margin:4px 0 0;font-size:14px">${reg.id}</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p style="margin-top:0;font-size:14px">Square isn't configured, so this registration was saved without payment. Follow up with the customer directly to collect $${reg.amountPaid.toFixed(2)}.</p>
          <table style="width:100%;border-collapse:collapse">
            ${[
              ['Name', reg.customerName],
              ['Email', reg.customerEmail],
              ['Phone', reg.customerPhone || '—'],
              ['Seats', String(reg.seats)],
              ['Owed', `$${reg.amountPaid.toFixed(2)}`],
            ].map(([label, value]) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:100px">${label}</td>
                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:500">${value}</td>
              </tr>
            `).join('')}
          </table>
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
