import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, upsertProduct } from '@/lib/integrations/v9-pos/service';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, products } = await req.json();
    
    if (!apiKey) return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });

    const auth = await validateApiKey(apiKey);
    if (!auth) return NextResponse.json({ success: false, error: 'Invalid API Key' }, { status: 401 });

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ success: false, error: 'Products array is required' }, { status: 400 });
    }

    const results = [];
    for (const p of products) {
      try {
        const res = await upsertProduct(auth.storeId, p);
        results.push({ id: p.id, status: 'success', externalId: res.id });
      } catch (err) {
        results.push({ id: p.id, status: 'failed', error: String(err) });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
