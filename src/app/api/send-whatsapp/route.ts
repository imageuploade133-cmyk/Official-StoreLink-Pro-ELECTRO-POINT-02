import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { doc, getDoc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/types';


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, message } = body;

    // Input validation
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Recipients must be a non-empty array' }),
        { status: 400 }
      );
    }
    if (typeof message !== 'string' || message.trim() === '') {
      return new NextResponse(
        JSON.stringify({ error: 'Message must be a non-empty string' }),
        { status: 400 }
      );
    }

    // Fetch credentials from Firestore
    const { firestore } = initializeFirebase();
    const settingsRef = doc(firestore, 'settings', 'global');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
        return new NextResponse(JSON.stringify({ error: 'Global settings not found.' }), { status: 500 });
    }
    const settings = settingsSnap.data() as AppSettings;
    const { eBulkUsername, eBulkApiKey } = settings;
    
    if (!eBulkUsername || !eBulkApiKey) {
      return new NextResponse(
        JSON.stringify({ error: 'eBulkSMS credentials are not configured in settings.' }),
        { status: 500 }
      );
    }

    const payload = {
      WA: {
        auth: {
          username: eBulkUsername,
          apikey: eBulkApiKey,
        },
        message: {
          subject: "POS Notification",
          messagetext: message,
        },
        recipients: {
            msisdn: recipients,
        },
      },
    };

    const apiResponse = await fetch('https://api.ebulksms.com/sendwhatsapp.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const responseData = await apiResponse.json();

    if (!apiResponse.ok || responseData?.response?.status !== 'SUCCESS') {
        return new NextResponse(
            JSON.stringify({ 
                error: 'Failed to send WhatsApp message',
                details: responseData?.response?.statusdetail || 'Unknown API error'
            }),
            { status: apiResponse.status || 500 }
        );
    }
    
    return new NextResponse(JSON.stringify(responseData), { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/send-whatsapp:', error);
    let errorMessage = 'An unexpected error occurred';
    if (error.name === 'AbortError') {
      errorMessage = 'The request was aborted.';
    } else if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON received from client.';
    }

    return new NextResponse(
      JSON.stringify({ error: errorMessage, details: error.message }),
      { status: 500 }
    );
  }
}
