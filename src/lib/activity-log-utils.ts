import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { ActivityLog } from './types';

interface LogActivityParams {
    user: { uid: string; displayName: string | null; email?: string | null };
    actionType: ActivityLog['actionType'];
    entityType: ActivityLog['entityType'];
    entityId: string;
    summary: string;
    entityDescription: string;
    details?: Record<string, any>;
}

export async function logActivity(firestore: Firestore, { user, ...logData }: LogActivityParams): Promise<void> {
    if (!firestore || !user) {
        console.error("Firestore or user not provided for logging activity.");
        return;
    }
    
    const activityLog: Omit<ActivityLog, 'id'> = {
        ...logData,
        timestamp: serverTimestamp() as any,
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown User'
    };

    try {
        await addDoc(collection(firestore, "activityLogs"), activityLog);
    } catch (e) {
        console.error("Failed to log activity:", e);
    }
}
