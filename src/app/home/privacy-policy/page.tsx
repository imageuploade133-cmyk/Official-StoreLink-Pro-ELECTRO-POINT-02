import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">Privacy Policy</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Last Updated: October 24, 2023</p>
        </div>

        <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:font-medium prose-p:leading-relaxed prose-li:font-medium">
          <p>
            At StoreLink Pro, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">1. Information We Collect</h2>
          <p>
            We collect information that you provide directly to us, such as when you create an account, subscribe to our newsletter, or contact us for support. This may include:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Name and contact data (email address, phone number)</li>
            <li>Credentials (passwords, security hints)</li>
            <li>Payment data (processed by secure third-party payment processors)</li>
            <li>Profile data (interests, favorites, and other profile information)</li>
          </ul>

          <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">2. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices, updates, and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Develop new products and features</li>
          </ul>

          <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">3. Data Security</h2>
          <p>
            We implement appropriate technical and organizational security measures to protect the security of any personal information we process. However, please remember that no method of transmission over the internet is 100% secure.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">4. Sharing of Information</h2>
          <p>
            We do not sell your personal information. We may share information with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">5. Your Privacy Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal information, including the right to access, correct, or delete the data we hold about you.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">6. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The updated version will be indicated by an updated &quot;Last Updated&quot; date and the updated version will be effective as soon as it is accessible.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">7. Contact Us</h2>
          <p>
            If you have questions or comments about this policy, you may email us at privacy@storelinkpro.com.
          </p>
        </div>
      </div>
    </div>
  );
}
