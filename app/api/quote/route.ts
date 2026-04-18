import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB } from '@/lib/orders';
import { sendQuoteRequestNotificationToOwner, sendQuoteAcknowledgementToCustomer } from '@/lib/email';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    let savedFileName = formData.get('fileName') as string || 'unknown';
    if (file && file.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const bytes = await file.arrayBuffer();
      fs.writeFileSync(path.join(uploadsDir, safeName), Buffer.from(bytes));
      savedFileName = safeName;
    }

    const db = getDB();
    const quote = {
      id: `QUO-${Date.now()}`,
      customerName: formData.get('name') as string,
      customerEmail: formData.get('email') as string,
      customerPhone: (formData.get('phone') as string) || undefined,
      fileName: savedFileName,
      material: formData.get('material') as string,
      color: formData.get('color') as string,
      quantity: parseInt(formData.get('quantity') as string),
      notes: (formData.get('notes') as string) || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.quotes.push(quote);
    saveDB(db);

    // Send emails
    await Promise.allSettled([
      sendQuoteRequestNotificationToOwner(quote),
      sendQuoteAcknowledgementToCustomer({
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        id: quote.id,
      }),
    ]);

    return NextResponse.json({ success: true, quoteId: quote.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save quote' }, { status: 500 });
  }
}
