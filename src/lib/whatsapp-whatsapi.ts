import { formatNigerianPhoneNumber } from './whatsapp-ebulk';
import { decrypt } from './encryption';

interface SendTextOptions {
  gatewayUrl: string;
  apiKey: string;
  instanceId: string;
  recipient: string;
  message: string;
}

interface SendMediaOptions {
  gatewayUrl: string;
  apiKey: string;
  instanceId: string;
  recipient: string;
  caption: string;
  fileUrl: string;
}

interface SendButtonOptions {
  gatewayUrl: string;
  apiKey: string;
  instanceId: string;
  recipient: string;
  body: string;
  footer?: string;
  buttonText?: string;
  buttonUrl?: string;
}

function resolveApiKey(apiKey: string): string {
  if (apiKey && apiKey.includes(':')) {
    try {
      return decrypt(apiKey);
    } catch (e) {
      console.error('Failed to decrypt WhatsAPI Key:', e);
    }
  }
  return apiKey;
}

function cleanBaseUrl(url: string): string {
  let base = (url || 'http://localhost:3000').trim();
  if (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  return base;
}

/**
 * Sends a plain text WhatsApp message using WhatsAPI Multi-Device Gateway
 * POST /api/send/text
 */
export async function sendWhatsApiText(options: SendTextOptions): Promise<any> {
  const { gatewayUrl, apiKey, instanceId, recipient, message } = options;
  const baseUrl = cleanBaseUrl(gatewayUrl);
  const clearApiKey = resolveApiKey(apiKey);
  const formattedNumber = formatNigerianPhoneNumber(recipient);

  const endpoint = `${baseUrl}/api/send/text`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': clearApiKey,
        'X-Instance-ID': instanceId,
      },
      body: JSON.stringify({
        number: formattedNumber,
        message: message,
      }),
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { status: 'FAILED', message: text };
    }

    const isSuccess = response.ok && (data.status === 'SUCCESS' || data.success === true || data.id);
    return {
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      statusdetail: data.message || data.statusdetail || (isSuccess ? 'Message dispatched via WhatsAPI' : `HTTP ${response.status}`),
      data,
    };
  } catch (error: any) {
    console.error('Error sending text via WhatsAPI:', error);
    return {
      status: 'FAILED',
      statusdetail: error.message || 'Network error connecting to WhatsAPI gateway',
      error,
    };
  }
}

/**
 * Sends a media WhatsApp message using WhatsAPI Multi-Device Gateway
 * POST /api/send/media
 */
export async function sendWhatsApiMedia(options: SendMediaOptions): Promise<any> {
  const { gatewayUrl, apiKey, instanceId, recipient, caption, fileUrl } = options;
  const baseUrl = cleanBaseUrl(gatewayUrl);
  const clearApiKey = resolveApiKey(apiKey);
  const formattedNumber = formatNigerianPhoneNumber(recipient);

  const endpoint = `${baseUrl}/api/send/media`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': clearApiKey,
        'X-Instance-ID': instanceId,
      },
      body: JSON.stringify({
        number: formattedNumber,
        caption: caption,
        fileUrl: fileUrl,
      }),
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { status: 'FAILED', message: text };
    }

    const isSuccess = response.ok && (data.status === 'SUCCESS' || data.success === true || data.id);
    return {
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      statusdetail: data.message || data.statusdetail || (isSuccess ? 'Media dispatched via WhatsAPI' : `HTTP ${response.status}`),
      data,
    };
  } catch (error: any) {
    console.error('Error sending media via WhatsAPI:', error);
    return {
      status: 'FAILED',
      statusdetail: error.message || 'Network error connecting to WhatsAPI gateway',
      error,
    };
  }
}

/**
 * Sends a button/CTA WhatsApp message using WhatsAPI Multi-Device Gateway
 * POST /api/send/button
 */
export async function sendWhatsApiButton(options: SendButtonOptions): Promise<any> {
  const { gatewayUrl, apiKey, instanceId, recipient, body, footer, buttonText, buttonUrl } = options;
  const baseUrl = cleanBaseUrl(gatewayUrl);
  const clearApiKey = resolveApiKey(apiKey);
  const formattedNumber = formatNigerianPhoneNumber(recipient);

  const endpoint = `${baseUrl}/api/send/button`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': clearApiKey,
        'X-Instance-ID': instanceId,
      },
      body: JSON.stringify({
        number: formattedNumber,
        body: body,
        footer: footer || 'StoreLink Pro',
        buttonText: buttonText || 'View Details',
        buttonUrl: buttonUrl || '',
      }),
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { status: 'FAILED', message: text };
    }

    const isSuccess = response.ok && (data.status === 'SUCCESS' || data.success === true || data.id);
    return {
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      statusdetail: data.message || data.statusdetail || (isSuccess ? 'Button message dispatched via WhatsAPI' : `HTTP ${response.status}`),
      data,
    };
  } catch (error: any) {
    console.error('Error sending button message via WhatsAPI:', error);
    return {
      status: 'FAILED',
      statusdetail: error.message || 'Network error connecting to WhatsAPI gateway',
      error,
    };
  }
}
