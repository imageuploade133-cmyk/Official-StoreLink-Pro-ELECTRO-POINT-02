
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, upsertProduct } from '@/lib/integrations/v9-pos/service';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, product } = await req.json();
    
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });
    }

    const auth = await validateApiKey(apiKey);
    
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Invalid API Key' }, { status: 401 });
    }

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product data is required' }, { status: 400 });
    }

    const result = await upsertProduct(auth.storeId, product);

    return NextResponse.json({ 
      success: true, 
      externalProductId: result.id,
      action: result.action 
    });
  } catch (error: any) {
    console.error('Create/Update product error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
