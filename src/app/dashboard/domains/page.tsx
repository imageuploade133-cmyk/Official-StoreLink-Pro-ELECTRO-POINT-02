
import { headers } from 'next/headers';
import DomainsClient from './DomainsClient';
import { getMainDomain, getProtocol } from '@/lib/domain';

export default async function DomainsPage() {
  const headersList = await headers();
  const host = headersList.get('host');
  
  const mainDomain = getMainDomain(host);
  const protocol = getProtocol();

  return (
    <DomainsClient 
      initialMainDomain={mainDomain} 
      initialProtocol={protocol} 
    />
  );
}
