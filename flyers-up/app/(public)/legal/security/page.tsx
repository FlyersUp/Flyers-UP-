import { LegalPageShell } from '@/components/LegalPageShell';

const VERSION = '2026-03-11';

export const metadata = {
  title: 'Data Security Policy — Flyers Up',
};

export default function SecurityPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Policy v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Data Security Policy</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          This Data Security Policy describes the security practices Flyers Up LLC (&quot;Flyers Up,&quot; &quot;we,&quot; or &quot;us&quot;)
          employs to protect user data. This policy is intended to provide transparency regarding our security
          standards. It is incorporated by reference into our Privacy Policy.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Encryption</h2>
        <p>
          We use industry-standard encryption to protect data in transit and at rest. All data transmitted between your
          device and our servers is encrypted using TLS (Transport Layer Security). Sensitive data stored in our
          databases is encrypted at rest. We use encryption standards consistent with industry best practices for
          technology platforms.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — Secure Payments</h2>
        <p>
          Payment processing is handled by Stripe, a PCI-DSS compliant payment processor. We do not store full credit
          card numbers on our servers. Card data is transmitted directly to Stripe and is subject to Stripe&apos;s
          security controls. Payouts to Pros are processed through Stripe Connect, which maintains its own security
          standards.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Authentication</h2>
        <p>
          User authentication is managed through secure authentication providers. We use industry-standard practices
          for password hashing and session management. We encourage users to use strong passwords and to enable
          two-factor authentication where available. Account credentials are protected and are not shared with third
          parties except as necessary to operate the Platform.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Access Controls</h2>
        <p>
          We implement access controls to limit access to user data to authorized personnel who need such access to
          perform their job functions. Access is granted on a least-privilege basis. We use role-based access
          controls and audit logging where appropriate.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Infrastructure Security</h2>
        <p>
          Our Platform is hosted on infrastructure operated by reputable cloud providers that maintain robust
          physical and logical security controls. We rely on our hosting and database providers for infrastructure
          security, including network security, intrusion detection, and physical security of data centers.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Monitoring and Incident Response</h2>
        <p>
          We monitor our systems for suspicious activity and security incidents. In the event of a data breach or
          security incident that affects user data, we will notify affected users and relevant authorities as required
          by applicable law. Our incident response procedures include containment, investigation, remediation, and
          post-incident review.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Third-Party Security</h2>
        <p>
          We use third-party services for payment processing, authentication, hosting, and analytics. We select
          vendors that maintain appropriate security standards. However, we do not control the security practices of
          third parties and are not responsible for their security. Our Privacy Policy describes the third-party
          services we use.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — User Responsibilities</h2>
        <p>
          Users are responsible for maintaining the confidentiality of their account credentials and for all activity
          occurring under their account. Users should not share passwords, enable two-factor authentication where
          available, and report suspected unauthorized access promptly.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 9 — No Guarantee</h2>
        <p>
          While we implement reasonable security measures, no system is 100% secure. We cannot guarantee that our
          security measures will prevent all unauthorized access, use, or disclosure. We will continue to evaluate and
          improve our security practices.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 10 — Contact</h2>
        <p>
          To report a security concern: Flyers Up LLC — hello.flyersup@gmail.com
        </p>
      </div>
    </LegalPageShell>
  );
}
