import type { WhatsappPayload, Settings, Product } from './types';

export async function sendWhatsAppReceipt(payload: WhatsappPayload): Promise<void> {
    
    let messageBody = '';

    if (payload.eventType === 'sale_paid' && payload.storeName && payload.items) {
        const currency = payload.currencySymbol || '$';
        messageBody += `*${payload.heading || 'SALE RECEIPT'}*\n`;
        messageBody += `*${payload.storeName}*\n\n`;
        messageBody += `Hi ${payload.customerName},\nThank you for your purchase!\n\n`;
        messageBody += '*--- ITEMS ---*\n';
        payload.items.forEach(item => {
            messageBody += `${item.name} (x${item.qty}) - ${currency}${item.price.toFixed(2)}\n`;
        });
        messageBody += '\n*--- SUMMARY ---*\n';
        if (typeof payload.subtotal === 'number') {
            messageBody += `Subtotal: ${currency}${payload.subtotal.toFixed(2)}\n`;
        }
        if (typeof payload.discountAmount === 'number' && payload.discountAmount > 0) {
            messageBody += `Discount: -${currency}${payload.discountAmount.toFixed(2)}\n`;
        }
        if (typeof payload.total === 'number') {
            messageBody += `*Total: ${currency}${payload.total.toFixed(2)}*\n\n`;
        }
        if (typeof payload.amountPaid === 'number') {
            messageBody += `Amount Paid: ${currency}${payload.amountPaid.toFixed(2)}\n`;
        }
        if (typeof payload.changeGiven === 'number' && payload.changeGiven > 0) {
            messageBody += `Change Given: ${currency}${payload.changeGiven.toFixed(2)}\n`;
        }
        if (payload.paymentMethod) {
             messageBody += `Payment Method: ${payload.paymentMethod}\n`;
        }
    } else if (payload.eventType === 'order_placed' && payload.orderId && payload.items) {
        const currency = payload.currencySymbol || '$';
        messageBody += `*ORDER CONFIRMATION*\n`;
        messageBody += `*${payload.storeName || 'Your Store'}*\n\n`;
        messageBody += `Hi ${payload.customerName},\nThank you for your order!\nYour Order ID is: *#${payload.orderId.substring(0, 12).toUpperCase()}*\n\n`;
        messageBody += '*--- ITEMS ---*\n';
        payload.items.forEach(item => {
            messageBody += `${item.name} (x${item.qty}) - ${currency}${item.price.toFixed(2)}\n`;
        });
        messageBody += '\n*--- SUMMARY ---*\n';
        if (typeof payload.total === 'number') {
            messageBody += `*Total Amount: ${currency}${payload.total.toFixed(2)}*\n`;
        }
        if (payload.paymentMethod) {
            messageBody += `Payment Method: ${payload.paymentMethod}\n`;
        }
        if (payload.message) { // Use for reference codes or extra instructions
            messageBody += `\n${payload.message}\n`;
        }
    } else if (payload.eventType === 'staff_order_alert' && payload.orderId) {
        const currency = payload.currencySymbol || '$';
        messageBody += `*NEW STORE ORDER ALERT*\n`;
        messageBody += `Order ID: *#${payload.orderId.substring(0, 12).toUpperCase()}*\n`;
        messageBody += `Customer: ${payload.customerName}\n`;
        messageBody += `Total: *${currency}${payload.total?.toFixed(2)}*\n`;
        messageBody += `Payment: ${payload.paymentMethod}\n\n`;
        messageBody += `Please log in to the dashboard to process this order.`;
    } else {
        // Fallback for custom messages
        messageBody = payload.message || '';
    }

    let fullMessage = '';

    if (payload.greeting) {
        fullMessage += `${payload.greeting}\n\n`;
    }

    fullMessage += messageBody;

    if (payload.footer) {
        fullMessage += `\n\n${payload.footer}`;
    }

    const apiPayload = {
      recipients: [payload.phone],
      message: fullMessage,
    };

    try {
        const response = await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiPayload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send WhatsApp message via API route:', errorData);
            throw new Error(errorData.details || errorData.error || 'Failed to send WhatsApp message');
        }
    } catch (networkError: any) {
        console.error('Network error during fetch to /api/send-whatsapp:', networkError);
        throw new Error(`Connection to notification service failed: ${networkError.message || 'Unknown network error'}`);
    }
}


export async function sendStockAlert(product: Product, settings: Settings | null): Promise<boolean> {
    if (!settings?.enableLowStockAlerts || !settings.lowStockAlertPhoneNumber) {
        return false;
    }

    const stock = product.stock;
    const threshold = product.lowStockThreshold ?? settings.lowStockThreshold ?? 10;
    
    let alertMessage: string | null = null;
    
    if (stock <= 0 && settings.outOfStockAlertMessage) {
        alertMessage = settings.outOfStockAlertMessage.replace(/{productName}/g, product.name);
    } else if (stock > 0 && stock <= threshold && settings.lowStockAlertMessage) {
        alertMessage = settings.lowStockAlertMessage
            .replace(/{productName}/g, product.name)
            .replace(/{currentStock}/g, String(stock))
            .replace(/{lowStockThreshold}/g, String(threshold));
    }
    
    if (alertMessage) {
        try {
            const apiPayload = {
                recipients: [settings.lowStockAlertPhoneNumber],
                message: alertMessage,
            };

            const response = await fetch('/api/send-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to send stock alert via API route:', errorData);
                // We don't throw an error here to not block the main flow, just log it.
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error sending stock alert:', error);
            return false;
        }
    }

    return false;
}
