
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/integrations/v9-pos/service';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();
    
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });
    }

    const auth = await validateApiKey(apiKey);
    
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Invalid API Key' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      storeId: auth.storeId,
      message: 'Connection successful' 
    });
  } catch (error: any) {
    console.error('Test connection error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
