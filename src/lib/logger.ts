import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { Customer, CustomerHistory } from './types';

interface LogData {
    action: CustomerHistory['action'];
    store_id: string;
    entityId: string;
    entityDescription: string;
    userId: string;
    userName: string;
    beforeData?: Partial<Customer> | null;
    afterData?: Partial<Customer> | null;
}

export async function logCustomerActivity(firestore: Firestore, logData: LogData) {
    if (!firestore) {
        console.error("Firestore not available for logging");
        return;
    }

    const { action, store_id, entityId, entityDescription, userId, userName, beforeData, afterData } = logData;

    let details = '';
    if (action === 'CREATE') {
        details = `New customer "${entityDescription}" was created.`;
    } else if (action === 'DELETE') {
        details = `Customer "${entityDescription}" was deleted.`;
    } else if (action === 'UPDATE') {
        const changes: string[] = [];
        const allKeys = new Set([...Object.keys(beforeData || {}), ...Object.keys(afterData || {})]);
        const keysToIgnore = ['updatedAt', 'createdAt'];
        
        allKeys.forEach(key => {
            if(keysToIgnore.includes(key)) return;
            
            const beforeValue = (beforeData as any)?.[key];
            const afterValue = (afterData as any)?.[key];
            
            if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
                const formatValue = (val: any) => val === undefined || val === null || val === '' ? 'not set' : `'${val}'`;
                changes.push(`${key} from ${formatValue(beforeValue)} to ${formatValue(afterValue)}`);
            }
        });
        details = changes.length > 0 ? `Customer "${entityDescription}" updated: ${changes.join(', ')}` : `Customer "${entityDescription}" was saved with no changes.`;
    } else if (action === 'STATUS_UPDATE') {
        details = `Status for "${entityDescription}" changed from '${beforeData?.status}' to '${afterData?.status}'.`;
    } else if (action === 'PAYMENT' || action === 'SALE') {
        // More specific details would be passed in a real scenario
        details = `${action} recorded for "${entityDescription}".`;
    }

    const historyEntry: Omit<CustomerHistory, 'id'> = {
        customerId: entityId,
        customerName: entityDescription,
        store_id,
        action,
        timestamp: serverTimestamp() as any, // Cast because serverTimestamp returns a sentinel value
        userId,
        userName,
        details,
        beforeData: beforeData || {},
        afterData: afterData || {},
    };

    try {
        await addDoc(collection(firestore, 'customerHistory'), historyEntry);
    } catch (e) {
        console.error("Failed to log customer activity:", e);
        // Optionally, re-throw or handle this error more gracefully
    }
}
