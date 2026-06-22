
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, upsertProduct } from '@/lib/integrations/v9-pos/service';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, products } = await req.json();
    
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });
    }

    const auth = await validateApiKey(apiKey);
    
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Invalid API Key' }, { status: 401 });
    }

    if (!Array.isArray(products)) {
      return NextResponse.json({ success: false, error: 'Products array is required' }, { status: 400 });
    }

    const results = [];
    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    // Process in sequence to avoid hitting Firestore limits or overwhelming the server
    for (const product of products) {
      try {
        const result = await upsertProduct(auth.storeId, product);
        results.push({ 
          sourceProductId: product.id, 
          externalProductId: result.id, 
          success: true,
          action: result.action
        });
        if (result.action === 'created') createdCount++;
        else updatedCount++;
      } catch (err: any) {
        results.push({ 
          sourceProductId: product.id, 
          success: false, 
          error: err.message 
        });
        failedCount++;
      }
    }

    const response = NextResponse.json({ 
      success: true, 
      processedCount: products.length,
      createdCount,
      updatedCount,
      failedCount,
      results
    });

    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error: any) {
    console.error('Bulk sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
