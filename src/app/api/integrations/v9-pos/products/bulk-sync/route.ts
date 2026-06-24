import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, upsertProduct } from '@/lib/integrations/v9-pos/service';

export async function OPTIONS() {
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
console.log('[StoreLink Pro Bulk Sync] route hit');

try {
let body: any = {};
let rawBody = '';

```
// Safe request parsing
try {
  rawBody = await req.text();
  console.log('[StoreLink Pro Bulk Sync] request body length:', rawBody.length);
  body = rawBody ? JSON.parse(rawBody) : {};
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[StoreLink Pro Bulk Sync] invalid request body:', message);

  return NextResponse.json(
    {
      success: false,
      message: 'Invalid request body',
      error: message,
    },
    {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    }
  );
}

const { apiKey, products } = body;

if (!apiKey) {
  return NextResponse.json(
    {
      success: false,
      message: 'API Key is required',
    },
    {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    }
  );
}

const auth = await validateApiKey(apiKey);

if (!auth) {
  return NextResponse.json(
    {
      success: false,
      message: 'Invalid API Key',
    },
    {
      status: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
    }
  );
}

if (!Array.isArray(products)) {
  return NextResponse.json(
    {
      success: false,
      message: 'Products array is required',
    },
    {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    }
  );
}

const results: any[] = [];
let createdCount = 0;
let updatedCount = 0;
let failedCount = 0;

console.log('[StoreLink Pro Bulk Sync] processing products:', products.length);

// Process in sequence to avoid Firestore overload
for (const product of products) {
  try {
    const result = await upsertProduct(auth.storeId, product);

    results.push({
      sourceProductId: product?.id ?? null,
      externalProductId: result.id,
      success: true,
      action: result.action,
    });

    if (result.action === 'created') createdCount++;
    else updatedCount++;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error('[StoreLink Pro Bulk Sync] product sync failed:', {
      sourceProductId: product?.id ?? null,
      sku: product?.sku ?? null,
      name: product?.name ?? null,
      message,
    });

    results.push({
      sourceProductId: product?.id ?? null,
      success: false,
      error: message,
    });

    failedCount++;
  }
}

const response = NextResponse.json({
  success: true,
  message: `Processed ${products.length} products. Created: ${createdCount}, Updated: ${updatedCount}, Failed: ${failedCount}`,
  totalProcessed: products.length,
  createdCount,
  updatedCount,
  failedCount,
  results,
});

response.headers.set('Access-Control-Allow-Origin', '*');
return response;
```

} catch (error) {
const message = error instanceof Error ? error.message : String(error);
const stack = error instanceof Error ? error.stack : undefined;

```
console.error('[StoreLink Pro Bulk Sync] fatal error:', {
  message,
  stack,
});

return NextResponse.json(
  {
    success: false,
    message: 'Bulk sync failed',
    error: message,
  },
  {
    status: 500,
    headers: { 'Access-Control-Allow-Origin': '*' },
  }
);
```

}
}
