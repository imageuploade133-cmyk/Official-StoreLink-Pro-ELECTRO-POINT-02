import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, items, totalAmount, totalCost, email } = body;

    const orderRef = adminDb.collection('orders').doc();
    await orderRef.set({
      store_id: storeId,
      items,
      totalAmount,
      totalCost,
      status: 'pending',
      isPaid: false,
      paymentMethod: 'Express Checkout',
      createdAt: FieldValue.serverTimestamp(),
      guestInfo: email ? { email, name: 'Guest', address: 'Collected at checkout' } : null
    });

    return NextResponse.json({ success: true, orderId: orderRef.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
