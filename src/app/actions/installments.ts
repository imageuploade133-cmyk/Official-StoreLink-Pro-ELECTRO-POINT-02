'use server'

import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { InstallmentRecord, PaymentRecord } from '@/lib/types';
import { sendWhatsAppViaEBulkSMS, getWhatsAppSettings, logWhatsAppMessage } from '@/lib/whatsapp-ebulk';

export async function createInstallmentPlanAction({
    storeId,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    productId,
    productName,
    totalAmount,
    downPaymentAmount,
    numberOfPayments,
    paymentInterval,
    nextDueDate,
    lateFee,
    paymentMethod,
    paymentReference
}: {
    storeId: string;
    customerId: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    productId: string;
    productName: string;
    totalAmount: number;
    downPaymentAmount: number;
    numberOfPayments: number;
    paymentInterval: 'daily' | 'weekly' | 'monthly' | 'custom';
    nextDueDate: Date;
    lateFee?: number;
    paymentMethod: string;
    paymentReference?: string;
}) {
    try {
        const installmentRef = adminDb.collection('installmentRecords').doc();
        
        const firstPayment: PaymentRecord = {
            paymentDate: admin.firestore.Timestamp.now() as any,
            amountPaid: downPaymentAmount,
            paymentMethod: paymentMethod,
            notes: `Down payment for ${productName}. Ref: ${paymentReference || 'N/A'}`
        };

        const installmentData: any = {
            store_id: storeId,
            customerId: customerId,
            customerName: customerName,
            customerEmail: customerEmail || null,
            customerPhone: customerPhone || null,
            productId: productId,
            productName: productName,
            totalAmount: totalAmount,
            downPaymentAmount: downPaymentAmount,
            remainingBalance: totalAmount - downPaymentAmount,
            numberOfPayments: numberOfPayments,
            paymentInterval: paymentInterval,
            nextDueDate: admin.firestore.Timestamp.fromDate(nextDueDate),
            lastPaymentDate: admin.firestore.Timestamp.now(),
            lateFee: lateFee || 0,
            status: 'active',
            paymentHistory: [firstPayment],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await installmentRef.set(installmentData);

        return { success: true, installmentId: installmentRef.id };
    } catch (error: any) {
        console.error('Error creating installment plan:', error);
        return { success: false, error: error.message };
    }
}

export async function recordInstallmentPaymentAction(installmentId: string, amount: number, paymentMethod: string, notes?: string) {
    try {
        const installmentRef = adminDb.collection('installmentRecords').doc(installmentId);
        
        await adminDb.runTransaction(async (transaction) => {
            const installmentDoc = await transaction.get(installmentRef);
            if (!installmentDoc.exists) throw new Error('Installment record not found');
            
            const data = installmentDoc.data() as InstallmentRecord;
            const newRemainingBalance = Math.max(0, data.remainingBalance - amount);
            const isCompleted = newRemainingBalance === 0;
            
            const newPayment: PaymentRecord = {
                paymentDate: admin.firestore.Timestamp.now() as any,
                amountPaid: amount,
                paymentMethod: paymentMethod,
                notes: notes || null
            };

            // Calculate next due date based on interval
            let nextDue = data.nextDueDate.toDate();
            if (!isCompleted) {
                if (data.paymentInterval === 'daily') nextDue.setDate(nextDue.getDate() + 1);
                else if (data.paymentInterval === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
                else if (data.paymentInterval === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);
            }

            transaction.update(installmentRef, {
                remainingBalance: newRemainingBalance,
                status: isCompleted ? 'completed' : data.status,
                lastPaymentDate: admin.firestore.Timestamp.now(),
                nextDueDate: isCompleted ? data.nextDueDate : admin.firestore.Timestamp.fromDate(nextDue),
                paymentHistory: admin.firestore.FieldValue.arrayUnion(newPayment),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error recording installment payment:', error);
        return { success: false, error: error.message };
    }
}

export async function sendInstallmentReminderAction(installmentId: string, storeId: string) {
    try {
        const installmentDoc = await adminDb.collection('installmentRecords').doc(installmentId).get();
        if (!installmentDoc.exists) throw new Error('Installment record not found');
        
        const data = installmentDoc.data() as InstallmentRecord;
        if (!data.customerPhone) throw new Error('Customer has no phone number for WhatsApp reminder.');

        const waSettings = await getWhatsAppSettings(storeId);
        if (!waSettings || !waSettings.enabled) {
            throw new Error('WhatsApp notifications are not enabled for this store.');
        }

        const nextDue = data.nextDueDate.toDate();
        const amount = data.remainingBalance / (data.numberOfPayments - data.paymentHistory.length + 1);
        
        const message = `*Hello ${data.customerName},*\n\n` +
                        `This is a friendly reminder for your installment payment for *${data.productName}*.\n\n` +
                        `*Amount Due:* ${amount.toLocaleString()}\n` +
                        `*Due Date:* ${nextDue.toLocaleDateString()}\n` +
                        `*Remaining Balance:* ${data.remainingBalance.toLocaleString()}\n\n` +
                        `Please make your payment to keep your plan active. Thank you!`;

        const result = await sendWhatsAppViaEBulkSMS(
            waSettings.username,
            waSettings.apiKey,
            [data.customerPhone],
            'Installment Reminder',
            message,
            2,
            waSettings.senderNumber
        );

        const status = result?.response?.status || result?.status;
        
        await logWhatsAppMessage({
            eventType: 'custom_message',
            messageContent: message,
            recipientPhone: data.customerPhone,
            customerName: data.customerName,
            status: status === 'SUCCESS' ? 'sent' : 'failed',
            unitsCharged: 1,
            userId: 'system',
            userName: 'Installment System',
            storeId: storeId,
            errorDetails: status !== 'SUCCESS' ? (result?.response?.statusdetail || result?.statusdetail) : null
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error sending reminder:', error);
        return { success: false, error: error.message };
    }
}
