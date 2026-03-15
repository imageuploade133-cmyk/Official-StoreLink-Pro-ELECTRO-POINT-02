import type { SaleTransaction, Customer, Settings } from './types';

export async function sendSmsReceipt(saleTransaction: SaleTransaction, customer: Customer | { name: string; phone: string }, settings: Settings | null): Promise<void> {
    console.log("Sending SMS Receipt (placeholder):", { saleTransaction, customer, settings });
    return Promise.resolve();
}
