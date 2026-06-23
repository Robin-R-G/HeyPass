# HeyPass — Complete User Manual

**Version 1.0 · June 2026**

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Event Management](#3-event-management)
4. [Registration System](#4-registration-system)
5. [Check-In & Check-Out](#5-check-in--check-out)
6. [Certificate Management](#6-certificate-management)
7. [Volunteer Management](#7-volunteer-management)
8. [Food Tokens](#8-food-tokens)
9. [Notifications](#9-notifications)
10. [Analytics & Reports](#10-analytics--reports)
11. [White Label Branding](#11-white-label-branding)
12. [Custom Domains](#12-custom-domains)
13. [Payment Gateways & Billing](#13-payment-gateways--billing)
14. [Subscription Plans](#14-subscription-plans)
15. [API Keys & Webhooks](#15-api-keys--webhooks)
16. [Integrating HeyPass into Your Website](#16-integrating-heypass-into-your-website)
17. [Domain & Sub-domain Setup for Clients](#17-domain--sub-domain-setup-for-clients)
18. [Security & Verification](#18-security--verification)
19. [Offline Support (PWA)](#19-offline-support-pwa)
20. [Troubleshooting & FAQ](#20-troubleshooting--faq)

---

## 1. Getting Started

### 1.1 Creating Your Account

1. Navigate to your HeyPass instance URL (e.g., `https://your-domain.com`).
2. Click **Dashboard** in the top-right corner.
3. You will be redirected to the authentication page.
4. Enter your email and password to log in, or register a new account.
5. Upon first login, you become the **Owner** of your organization with full administrative access.

### 1.2 Understanding Roles

HeyPass uses a role-based access control (RBAC) system with 5 roles:

| Role | Description |
|------|-------------|
| **Owner** | Full access to everything including billing, domains, and organization settings |
| **Admin** | Manage events, staff, settings, and billing (no owner-only actions) |
| **Manager** | Manage specific events, view analytics, handle registrations |
| **Volunteer** | Check-in/out attendees, scan QR codes at assigned gates |
| **Scanner** | Minimal access — only scan QR codes at assigned gates |

### 1.3 Your First Login

After logging in, you'll land on the **Dashboard** page showing all your events. Since this is a new account, the list will be empty. Click **Create Event** to get started.

---

## 2. Dashboard Overview

The main dashboard (`/dashboard`) displays:

- **All Events** — A list of every event in your organization with status, registration count, and check-in count.
- **Quick Stats** — Each event card shows registered and checked-in numbers.
- **Event Status** — Color-coded badges: `Published` (green), `Draft` (gray), `Ended` (blue).

Click any event card to open its dedicated management page.

---

## 3. Event Management

### 3.1 Creating an Event

1. From the dashboard, click **Create Event**.
2. Fill in the required fields:
   - **Title** — Event name (e.g., "TechConf 2026")
   - **Slug** — URL-friendly identifier (auto-generated from title, editable)
   - **Start Date / End Date** — Event duration
   - **Venue** — Physical location or "Online"
   - **Description** — Public-facing event description
3. Click **Create**. You'll be redirected to the event's management page.

### 3.2 Event Dashboard

Each event has a dedicated dashboard at `/dashboard/events/{eventId}/dashboard` showing:

- **Total Registered** — All registrations for this event
- **Total Checked In** — Attendees who have scanned in
- **Currently Inside** — People currently at the venue (checked in, not yet checked out)
- **Check-In Rate** — Percentage of registered attendees who checked in
- **Gate Breakdown** — Per-gate statistics (scans, check-ins, check-outs, fraud flags)
- **Hourly Distribution** — Check-in/out activity over time
- **Session Breakdown** — Per-session attendance data

### 3.3 Event Navigation Bar

Every event page has a top navigation bar with quick links to all sub-sections:

- Dashboard · Tickets · Gates · Staff · Volunteers · Forms · Branding · Analytics · Certificates · Notifications · Links · Pricing · Sub-Events · Emergency · Food Tokens · Sponsors

### 3.4 Event Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Event is being configured; not visible to registrants |
| **Published** | Event is live; registration links are active |
| **Ended** | Event has concluded; check-in/out is closed |

### 3.5 Cloning an Event

On any event's dashboard page, click **Clone Event** to duplicate the entire event structure (settings, forms, gates, branding, certificates) into a new event. You can then modify dates, titles, and details for the new instance.

---

## 4. Registration System

### 4.1 Registration Forms

Navigate to **Forms** in the event nav bar to create and manage registration forms.

#### Creating a Form

1. Click **Create Form**.
2. Choose to start from scratch or use a template.
3. Add fields using the **+ Add Field** button.
4. Each field has:
   - **Label** — Display name (e.g., "Full Name")
   - **Type** — Text, Email, Number, Phone, Dropdown, Checkbox, Radio, Textarea, File Upload, Date
   - **Required** — Toggle whether the field is mandatory
   - **Options** — For dropdown/radio/checkbox types, enter comma-separated options
5. Drag fields to reorder them.
6. Click **Save Form** when done.

#### Field Types

| Type | Use Case |
|------|----------|
| `text` | Name, organization, etc. |
| `email` | Email addresses (validated) |
| `number` | Student ID, age, etc. |
| `phone` | Phone numbers |
| `select` | Single choice from dropdown |
| `radio` | Single choice from visible options |
| `checkbox` | Multiple selections |
| `textarea` | Long text (dietary requirements, etc.) |
| `file` | File uploads (receipts, screenshots) |
| `date` | Date picker |

### 4.2 Registration Links

Navigate to **Links** to create public registration URLs:

1. Click **Create Link**.
2. Select the form to use.
3. The system generates a public URL like `/register/{slug}`.
4. Share this link with attendees via email, social media, or embed it on your website.

### 4.3 Registration Analytics

Each form has built-in analytics showing:
- Total submissions
- Completion rate
- Field-by-field response breakdown
- Time-series of submissions

### 4.4 Registration API

Registrations can also be submitted programmatically:

```bash
POST /api/events/{eventId}/registrations
Content-Type: application/json

{
  "form_id": "form-uuid",
  "data": {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+91-9876543210"
  }
}
```

---

## 5. Check-In & Check-Out

### 5.1 Gate Setup

Navigate to **Gates** to manage entry/exit points:

#### Gate Types

| Type | Purpose |
|------|---------|
| `main_entrance` | Primary entry point |
| `session_gate` | Individual session/session rooms |
| `exit_gate` | Dedicated exit tracking |
| `vip_lane` | VIP/speaker entry |

#### Creating a Gate

1. Click **Create Gate**.
2. Enter gate name (e.g., "Main Entrance", "Hall A Door").
3. Select gate type.
4. The system generates a unique QR code for this gate.
5. Assign staff members to monitor each gate.

### 5.2 Scanner Mode

Navigate to **Scanner** to open the QR code scanner:

1. Select the gate you're monitoring.
2. Click **Start Scanning**.
3. Point the device camera at an attendee's QR code.
4. The system validates the code and records check-in/out.
5. Visual and audio feedback confirms successful scans.

#### Scanner Features

- **Real-time validation** — Instant feedback on scan success/failure
- **Duplicate prevention** — Blocks repeat scans within a configurable window
- **Offline scanning** — Scans queue locally and sync when reconnected
- **Fraud detection** — Flags suspicious patterns (multiple rapid scans, expired codes)

### 5.3 Hybrid Check-Out

Check-out works in two modes:

1. **Manual** — Attendees scan their QR code at exit gates
2. **Auto** — After the event ends + configurable grace period, remaining attendees are automatically checked out

### 5.4 Gate Statistics

The Gates page shows live statistics per gate:
- Total scans, check-ins, check-outs
- Duplicates blocked
- Fraud flags
- Active staff count
- Last scan timestamp

---

## 6. Certificate Management

### 6.1 Certificate Types

HeyPass supports these certificate types:

| Type | Use Case |
|------|----------|
| **Participation** | General attendee participation |
| **Volunteer** | Volunteer service recognition |
| **Organizer** | Event organizer acknowledgment |
| **Speaker** | Speaker/presenter recognition |
| **Winner** | Competition winners |
| **Runner-Up** | Competition runners-up |

### 6.2 Certificate Templates

Navigate to **Certificates** → **Templates** to manage PDF templates:

1. Upload your base template image (PNG/JPG).
2. Add placeholder text fields (e.g., `{{name}}`, `{{event_title}}`, `{{date}}`).
3. Position each placeholder on the template using pixel coordinates.
4. Upload organizer assets:
   - IEEE/organization logo
   - College/institution logo
   - Event logo
   - Signature images
5. Preview the template with sample data.

### 6.3 Auto-Generated Certificates

Certificates are automatically generated when:
- An attendee completes check-in
- A volunteer completes their assigned tasks
- An organizer manually generates certificates

The system:
1. Merges attendee data into the template
2. Generates a PDF using Puppeteer
3. Stores the PDF in Supabase Storage
4. Creates a unique certificate number (`CERT-{YEAR}-{SEQ}-{HEX}`)
5. Generates a verification QR code

### 6.4 Manual Certificates

Navigate to **Certs** to manually create certificates:

1. Click **Add Certificate**.
2. Select certificate type and template.
3. Fill in recipient details (name, event, date, etc.).
4. Preview the certificate.
5. Click **Generate** to create the PDF.

#### Certs Page Actions

- **Download PDF** — Download the certificate as a PDF file
- **Download PNG** — Download as a PNG image
- **Share Link** — Copy a shareable verification link to clipboard
- **Revoke** — Mark a certificate as revoked (no longer verifies as valid)

### 6.5 Certificate Verification

Public verification is available at `/verify`:

1. Enter the certificate number (format: `CERT-2026-000000-ABCDEF`)
2. Or paste a verification URL/token
3. The system displays:
   - Validity status (Valid/Revoked/Not Found)
   - Recipient name, event, certificate type
   - Organization name
   - Issue date
   - Number of previous verification attempts

### 6.6 Share Links

Each certificate gets a unique verification URL:
```
https://your-domain.com/verify?token={access_token}
```

These links:
- Expire after 72 hours
- Allow maximum 100 accesses
- Can be regenerated if needed

---

## 7. Volunteer Management

### 7.1 Volunteer Registration

Attendees can register as volunteers through the registration form. Volunteers go through an approval workflow:

| Status | Meaning |
|--------|---------|
| **Pending** | Awaiting organizer approval |
| **Approved** | Accepted as a volunteer |
| **Rejected** | Application declined |
| **Checked In** | Volunteer has arrived and scanned in |

### 7.2 Task Management

Navigate to **Volunteers** → **Tasks** to manage volunteer assignments:

1. Click **Create Task**.
2. Fill in:
   - **Title** — Task name (e.g., "Registration Desk - Morning")
   - **Type** — General, setup, registration, cleanup, technical, etc.
   - **Location** — Physical location of the task
   - **Time Window** — Start and end times
   - **Slots** — Number of volunteers needed
3. Volunteers are automatically matched based on availability.

### 7.3 Volunteer Analytics

The Volunteers page shows:
- Total volunteers (approved, pending, checked-in)
- Task completion rates
- Hours logged per volunteer
- Performance metrics

### 7.4 Bulk Communication

Navigate to **Volunteers** → **Communicate**:

1. Select recipient group (All, Approved, Pending, Checked-In).
2. Enter subject and message.
3. Click **Send Message**.
4. Messages are delivered via email (if configured) or in-app notification.

---

## 8. Food Tokens

### 8.1 Token Types

Navigate to **Food Tokens** to manage meal tokens:

1. Click **Create Type**.
2. Configure:
   - **Name** — Token type name (e.g., "Lunch Day 1")
   - **Meal Time** — Breakfast, Lunch, Dinner, or Snack
   - **Valid Window** — Date/time range when tokens are valid
   - **Max Uses/Person** — How many times one person can use this token
   - **Total Quantity** — Maximum tokens to generate

### 8.2 Generating Tokens

Navigate to **Food Tokens** → **Generate**:

1. Select the token type from the dropdown.
2. Click **Generate Tokens**.
3. Tokens are bulk-generated for all registered attendees.
4. Each token gets a unique code that can be scanned or entered manually.

### 8.3 Validating Tokens

Navigate to **Food Tokens** → **Validate**:

1. Enter the token code (scanned or typed).
2. Click **Validate**.
3. The system shows:
   - Valid/Invalid status
   - Remaining uses for this person
   - Meal type and validity window

### 8.4 Token Statistics

The Stats tab shows:
- Total tokens issued vs. used
- Remaining tokens per meal type
- Usage breakdown by time of day

---

## 9. Notifications

### 9.1 Notification Center

Navigate to **Notifications** in the event nav bar:

- **Overview** — View all sent notifications with delivery status
- **Send** — Compose and send new notifications
- **Templates** — Manage reusable notification templates

### 9.2 Sending Notifications

Navigate to **Notifications** → **Send**:

1. Select recipient group (All Registrants, Checked-In, Not Checked-In, etc.).
2. Choose channel (Email, SMS, In-App).
3. Enter subject and body.
4. Use template variables: `{{name}}`, `{{event_title}}`, `{{date}}`, etc.
5. Click **Send**.

### 9.3 Notification Templates

Navigate to **Notifications** → **Templates**:

1. Create templates for common messages:
   - Registration confirmation
   - Check-in reminder
   - Certificate ready
   - Event updates
2. Templates support variable placeholders that auto-fill with recipient data.

### 9.4 Notification API

Send notifications programmatically:

```bash
POST /api/events/{eventId}/notifications/send
Content-Type: application/json

{
  "recipients": ["all"],
  "subject": "Event Update",
  "body": "Hi {{name}}, the event schedule has been updated.",
  "channel": "email"
}
```

---

## 10. Analytics & Reports

### 10.1 Event Analytics

Navigate to **Analytics** in the event nav bar:

#### Registration Analytics
- Total registrations over time
- Registration source breakdown
- Form field completion rates
- Demographic breakdown

#### Attendance Analytics
- Check-in/out timeline
- Peak hours visualization
- Gate-wise distribution
- Session attendance comparison

#### Revenue Analytics
- Total revenue collected
- Revenue by payment method
- Ticket type breakdown
- Refund statistics

#### Certificate Analytics
- Certificates generated vs. downloaded
- Verification attempts
- Share link usage

### 10.2 Exporting Reports

Navigate to **Analytics** → **Export** to download:

- **Registration CSV** — All registration data with custom filters
- **Attendance CSV** — Check-in/out records with timestamps
- **Revenue CSV** — All transactions with payment details
- **Certificate CSV** — Certificate status and verification data

### 10.3 Payment Exports

Navigate to **Tickets** → **Export** for payment-specific data:

- Filter by date range, payment status, ticket type
- Export includes: transaction ID, amount, payment method, status, timestamp

---

## 11. White Label Branding

### 11.1 Client Branding

Navigate to **Settings** → **Branding** to customize your organization's appearance:

#### Branding Assets
- **Organization Logo** — Displayed in nav, certificates, and emails
- **Event Logo** — Per-event logo override
- **Signature Images** — For certificate generation
- **Banner Image** — Event banner/header

#### Color Customization
- **Primary Color** — Main brand color (buttons, links, accents)
- **Secondary Color** — Complementary color
- **Background Color** — Page background
- **Text Color** — Primary text color

#### Custom CSS/JavaScript
- Add custom CSS to override any styling
- Add custom JavaScript for analytics, chat widgets, etc.

### 11.2 Event Branding Override

Each event can override the organization-level branding:

1. Navigate to **Branding** in the event nav bar.
2. Upload event-specific logos and assets.
3. Override colors for this specific event.
4. Preview changes in real-time.

### 11.3 Email Templates

Customize email templates for:
- Registration confirmation
- Check-in reminders
- Certificate delivery
- Password reset
- Custom notifications

Upload your organization logo to appear in all outgoing emails.

---

## 12. Custom Domains

### 12.1 Adding a Custom Domain

Navigate to **Settings** → **Domains**:

1. Click **Add Domain**.
2. Enter your custom domain (e.g., `events.yourcompany.com`).
3. The system provides DNS records to configure:

#### Option A: CNAME Record (Recommended)
```
Type: CNAME
Name: events
Value: cname.vercel-dns.com
TTL: Auto
```

#### Option B: A Record
```
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto
```

4. Add these records in your DNS provider (Cloudflare, GoDaddy, etc.).
5. Click **Verify** in HeyPass.
6. SSL certificate is automatically provisioned via Let's Encrypt.

### 12.2 Domain Verification

The system verifies:
- DNS records are correctly configured
- Domain resolves to HeyPass servers
- SSL certificate is valid
- No conflicts with existing domains

### 12.3 Rate Limits

- Domain verification: Maximum 10 attempts per hour
- DNS propagation: May take up to 48 hours
- SSL provisioning: Usually within minutes of verification

---

## 13. Payment Gateways & Billing

### 13.1 Payment Gateway Setup

Navigate to **Settings** → **Payments** or **Settings** → **Billing** → **Gateways**:

1. Click **Add Gateway**.
2. Select provider:
   - **Razorpay** — For Indian payments (UPI, cards, net banking)
   - **Cashfree** — Alternative Indian payment gateway
3. Enter API credentials:
   - **Key ID** — From your Razorpay/Cashfree dashboard
   - **Key Secret** — API secret key
4. Click **Save Gateway**.
5. The system verifies credentials and activates the gateway.

### 13.2 Payment Methods

Each organization can configure:
- Up to **2 bank accounts**
- Up to **1 UPI method**

### 13.3 Ticket Pricing

Navigate to **Pricing** in the event nav bar:

1. Toggle **Free Event** on/off.
2. For paid events:
   - Set ticket price
   - Enable/disable specific payment methods
   - Set early-bird pricing (optional)
   - Configure group discounts (optional)

### 13.4 Fraud Prevention

HeyPass includes built-in fraud detection:

- **Duplicate Payment Detection** — Flags multiple payments from same user
  - Toggle: Check Amount (disabled by default for same-price workshops)
  - Toggle: Check Email
  - Toggle: Check Phone
- **Suspicious Activity Flags** — Rapid registrations, multiple payment attempts
- **Manual Review** — Flag transactions for manual verification

### 13.5 Webhook Security

Payment webhooks from Razorpay/Cashfree are verified using:
- **HMAC-SHA256** signature verification
- **Timing-safe comparison** to prevent timing attacks
- **Rate limiting** — 100 requests per minute per IP
- **Replay prevention** — Webhook timestamps validated

---

## 14. Subscription Plans

### 14.1 Plan Overview

HeyPass offers tiered subscription plans:

| Plan | Events | Registrations | Features |
|------|--------|---------------|----------|
| **Free** | 1 | 100 | Basic features, HeyPass branding |
| **Starter** | 5 | 1,000 | White label, email notifications |
| **Professional** | 25 | 10,000 | Custom domains, API access, priority support |
| **Enterprise** | Unlimited | Unlimited | All features, dedicated support, SLA |

### 14.2 Single-Event Plans

For one-time events, organizers can purchase a **Single-Event Plan**:

1. Navigate to **Settings** → **Billing** → **Plans**.
2. Select a plan tier.
3. Customize pricing, commission rate, and limits for this single event.
4. Complete payment to activate.

### 14.3 Commission Model

HeyPass takes a percentage commission per transaction:

- Commission is calculated on the transaction amount
- GST (18%) is applied on the commission
- Invoices are generated monthly
- Commission rates are configurable per plan

### 14.4 Billing & Invoices

Navigate to **Settings** → **Billing** to view:
- Current plan and usage
- Transaction history
- Commission invoices (downloadable PDFs)
- Payment gateway status

---

## 15. API Keys & Webhooks

### 15.1 API Key Management

Navigate to **Settings** → **API Keys**:

1. Click **Create API Key**.
2. Enter a descriptive name (e.g., "Production Backend").
3. Select permissions:
   - `events:read` — Read event data
   - `events:write` — Create/update events
   - `registrations:read` — Read registrations
   - `registrations:write` — Create registrations
   - `certificates:read` — Read certificates
   - `certificates:write` — Generate certificates
4. Click **Create**.
5. **Copy the key immediately** — it won't be shown again.

### 15.2 Using API Keys

Include the key in the `Authorization` header:

```bash
curl -H "Authorization: Bearer hp_live_xxxxxxxxxxxxx" \
     https://your-domain.com/api/events
```

### 15.3 Webhook Configuration

Navigate to **Settings** → **Webhooks**:

1. Click **Add Webhook**.
2. Enter the endpoint URL.
3. Select events to subscribe to:
   - `registration.created`
   - `registration.updated`
   - `checkin.completed`
   - `certificate.generated`
   - `payment.completed`
   - `payment.failed`
4. Click **Save**.

### 15.4 Webhook Payload

All webhook payloads include:

```json
{
  "event": "registration.created",
  "timestamp": "2026-06-23T10:30:00Z",
  "data": {
    "id": "reg-uuid",
    "event_id": "evt-uuid",
    "attendee_name": "John Doe",
    "email": "john@example.com"
  }
}
```

### 15.5 Webhook Security

Each webhook includes:
- `X-HeyPass-Signature` — HMAC-SHA256 signature of the payload
- `X-HeyPass-Timestamp` — Unix timestamp of when the webhook was sent
- `X-HeyPass-Event` — Event type

Verify the signature using your webhook secret:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## 16. Integrating HeyPass into Your Website

### 16.1 Registration Widget (Embed)

Embed a registration form on your website:

```html
<iframe
  src="https://your-domain.com/register/event-slug"
  width="100%"
  height="800"
  frameborder="0"
  style="border: none; border-radius: 12px;"
></iframe>
```

### 16.2 Registration Link

Share a direct registration link:

```
https://your-domain.com/register/event-slug
```

### 16.3 Verification Widget

Add certificate verification to your site:

```html
<iframe
  src="https://your-domain.com/verify"
  width="100%"
  height="500"
  frameborder="0"
></iframe>
```

### 16.4 API Integration

Use the HeyPass API to build custom integrations:

#### Register an Attendee
```javascript
const response = await fetch('https://your-domain.com/api/events/{eventId}/registrations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer hp_live_xxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    form_id: 'form-uuid',
    data: {
      full_name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+91-9876543210',
      organization: 'MIT'
    }
  })
});
```

#### Verify a Certificate
```javascript
const response = await fetch('https://your-domain.com/api/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    certificate_number: 'CERT-2026-000001-A1B2C3D4',
    method: 'number'
  })
});
const result = await response.json();
// result.valid: true/false
// result.recipient_name, result.event_title, etc.
```

#### Get Event Analytics
```javascript
const response = await fetch('https://your-domain.com/api/events/{eventId}/analytics', {
  headers: { 'Authorization': 'Bearer hp_live_xxxxx' }
});
const analytics = await response.json();
```

### 16.5 React/Next.js Integration

For React applications:

```jsx
import { useEffect, useState } from 'react';

function RegistrationForm({ eventId, formId }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const res = await fetch(`/api/events/${eventId}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form_id: formId, data: formData })
    });
    
    if (res.ok) {
      alert('Registration successful!');
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Render form fields dynamically */}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
```

### 16.6 QR Code for Check-In

Generate gate-specific QR codes for scanning:

```bash
GET /api/events/{eventId}/gates/{gateId}/qr
```

Returns a PNG image of the QR code that scanners can use.

---

## 17. Domain & Sub-domain Setup for Clients

### 17.1 For Platform Operators (HeyPass Admins)

If you're running HeyPass as a multi-tenant platform:

#### Setting Up a Client's Custom Domain

1. Client purchases a domain (e.g., `events.clientcompany.com`).
2. Client provides DNS access or adds records themselves.
3. In HeyPass admin, navigate to **Settings** → **Domains**.
4. Add the client's domain.
5. Provide DNS configuration instructions:

**For `events.clientcompany.com`:**
```
Type: CNAME
Name: events
Value: cname.vercel-dns.com
```

**For `clientcompany.com` (apex domain):**
```
Type: A
Name: @
Value: 76.76.21.21
```

6. Client adds these records in their DNS provider.
7. Click **Verify** in HeyPass.
8. SSL is automatically provisioned.
9. The client's HeyPass instance is now live at their custom domain.

### 17.2 Sub-domain Configuration

For clients using subdomains:

| Client Domain | HeyPass URL | DNS Record |
|---------------|-------------|------------|
| `events.client.com` | `https://events.client.com` | CNAME → `cname.vercel-dns.com` |
| `checkin.client.com` | `https://checkin.client.com` | CNAME → `cname.vercel-dns.com` |
| `client.com` | `https://client.com` | A → `76.76.21.21` |

### 17.3 Client Onboarding Checklist

When onboarding a new client:

- [ ] Create organization account
- [ ] Set up owner and admin users
- [ ] Configure branding (logo, colors, email templates)
- [ ] Set up payment gateway (if paid events)
- [ ] Configure custom domain (if applicable)
- [ ] Create first event
- [ ] Set up registration form
- [ ] Configure gates and staff
- [ ] Test check-in flow
- [ ] Generate test certificate
- [ ] Verify certificate verification page
- [ ] Set up webhooks (if needed)
- [ ] Provide API keys (if needed)
- [ ] Train client on dashboard usage

### 17.4 White Label Configuration

For fully white-labeled client instances:

1. **Custom Domain** — Client uses their own domain
2. **Custom Branding** — Client's logo, colors, fonts
3. **Custom Email** — Emails sent from client's domain
4. **No HeyPass Branding** — Remove all HeyPass references
5. **Custom CSS** — Full styling control
6. **Custom JavaScript** — Analytics, chat widgets, etc.

---

## 18. Security & Verification

### 18.1 Authentication

- **Access Tokens** — JWT tokens with 15-minute expiry (HS256)
- **Refresh Tokens** — JWT tokens with 7-day expiry, rotating jti
- **Password Hashing** — PBKDF2 with 100,000 iterations (SHA-256)
- **Token Rotation** — Refresh tokens are rotated on each use

### 18.2 QR Code Security

Each QR code contains:
- **Version** — QR format version
- **Token ID** — 8-character prefix (no full access token in QR)
- **Nonce** — Unique random value per scan
- **Timestamp** — When the QR was generated
- **Expiry** — When the QR becomes invalid
- **Signature** — HMAC-SHA256 signature preventing tampering

#### Security Features

- **Replay Prevention** — Each nonce can only be used once
- **Rotation** — QR codes rotate after configurable number of scans
- **Rate Limiting** — 50 verifications per hour per IP
- **CAPTCHA** — Triggered after excessive failed attempts

### 18.3 Row-Level Security (RLS)

All database tables have RLS policies enforcing:
- **Client Isolation** — Each client can only access their own data
- **Role Enforcement** — Users can only perform actions their role allows
- **Audit Logging** — Critical actions are logged with before/after values

### 18.4 Data Protection

- **Encryption at Rest** — AES-256-GCM for sensitive data
- **Encryption in Transit** — TLS 1.3 for all connections
- **Billing Data** — Dedicated encryption key (≥32 characters)
- **Soft Delete** — All records use `deleted_at` timestamp (no hard deletes)

---

## 19. Offline Support (PWA)

### 19.1 Installing as PWA

1. Visit your HeyPass URL in a mobile browser.
2. Tap **Install** or **Add to Home Screen**.
3. HeyPass installs as a standalone app.

### 19.2 Offline Features

When offline:
- **QR Scanner** — Continues scanning and queuing results locally
- **View Data** — Cached event data remains accessible
- **Sync on Reconnect** — Queued scans automatically sync when back online
- **Conflict Resolution** — Latest timestamp wins

### 19.3 Service Worker

HeyPass registers a service worker that:
- Caches static assets (CSS, JS, icons)
- Caches API responses for offline reading
- Queues write operations for later sync
- Shows offline/online status indicator

---

## 20. Troubleshooting & FAQ

### Common Issues

**Q: My custom domain isn't verifying.**
A: DNS propagation can take up to 48 hours. Verify your DNS records using `dig` or an online DNS checker. Ensure no conflicting records exist.

**Q: Certificate PDFs aren't generating.**
A: Check that your Supabase Storage buckets (`certificates`, `event-branding`) are created and have correct permissions.

**Q: Payments are failing.**
A: Verify your Razorpay/Cashfree API credentials in Settings → Payments. Ensure the gateway is set to "Live" mode for production.

**Q: QR codes aren't scanning.**
A: Ensure the scanner device has camera permissions. Check that the gate is active and has assigned staff. Verify the attendee's QR code hasn't expired.

**Q: Emails aren't being delivered.**
A: Check your SendGrid configuration. Ensure your sender domain is verified in SendGrid. Check the notification logs for delivery errors.

**Q: How do I reset my password?**
A: Click "Forgot Password" on the login page. A reset link will be sent to your registered email.

**Q: Can I change my organization's slug/URL?**
A: Contact support. Changing the slug may break existing registration links.

### Error Codes

| Code | Meaning |
|------|---------|
| `AUTH_EXPIRED` | Access token has expired; refresh your token |
| `AUTH_INVALID` | Invalid credentials; check email/password |
| `FORBIDDEN` | Your role doesn't have permission for this action |
| `NOT_FOUND` | The requested resource doesn't exist |
| `RATE_LIMITED` | Too many requests; wait and retry |
| `VALIDATION_ERROR` | Invalid input; check required fields |

### Getting Help

- **Documentation** — This manual
- **API Reference** — Available at `/api/docs` (if enabled)
- **Support Email** — support@heypass.io
- **GitHub Issues** — Report bugs at your repository

---

## Appendix A: Complete Permission List

| Permission | Description |
|------------|-------------|
| `events.create` | Create new events |
| `events.read` | View event details |
| `events.update` | Edit event settings |
| `events.delete` | Delete events |
| `events.clone` | Clone events |
| `registrations.read` | View registrations |
| `registrations.manage` | Approve/reject registrations |
| `registrations.export` | Export registration data |
| `checkin.scan` | Scan QR codes for check-in |
| `checkin.manage` | Manage check-in settings |
| `certificates.read` | View certificates |
| `certificates.generate` | Generate certificates |
| `certificates.revoke` | Revoke certificates |
| `certificates.download` | Download certificate PDFs |
| `staff.read` | View staff members |
| `staff.manage` | Add/remove staff |
| `volunteers.read` | View volunteers |
| `volunteers.manage` | Manage volunteer approvals |
| `volunteers.communicate` | Send messages to volunteers |
| `gates.read` | View gate configuration |
| `gates.manage` | Create/edit gates |
| `branding.read` | View branding settings |
| `branding.manage` | Update branding |
| `analytics.read` | View analytics |
| `analytics.export` | Export analytics data |
| `notifications.send` | Send notifications |
| `notifications.manage` | Manage notification templates |
| `billing.read` | View billing information |
| `billing.manage` | Manage payment gateways |
| `domains.read` | View domain configuration |
| `domains.manage` | Add/verify domains |
| `api_keys.read` | View API keys |
| `api_keys.manage` | Create/revoke API keys |
| `webhooks.read` | View webhook configuration |
| `webhooks.manage` | Create/edit webhooks |
| `settings.read` | View organization settings |
| `settings.manage` | Update organization settings |

---

## Appendix B: API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/register` | Register |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET` | `/api/events` | List events |
| `POST` | `/api/events` | Create event |
| `GET` | `/api/events/{id}` | Get event details |
| `PUT` | `/api/events/{id}` | Update event |
| `DELETE` | `/api/events/{id}` | Delete event |
| `POST` | `/api/events/{id}/clone` | Clone event |
| `GET` | `/api/events/{id}/dashboard` | Event dashboard data |
| `GET` | `/api/events/{id}/registrations` | List registrations |
| `POST` | `/api/events/{id}/registrations` | Create registration |
| `GET` | `/api/events/{id}/gates` | List gates |
| `POST` | `/api/events/{id}/gates` | Create gate |
| `POST` | `/api/events/{id}/checkin` | Check-in attendee |
| `POST` | `/api/events/{id}/checkout` | Check-out attendee |
| `GET` | `/api/events/{id}/certificates` | List certificates |
| `POST` | `/api/events/{id}/certificates` | Generate certificate |
| `POST` | `/api/verify` | Verify certificate |
| `GET` | `/api/events/{id}/analytics` | Event analytics |
| `GET` | `/api/events/{id}/notifications` | List notifications |
| `POST` | `/api/events/{id}/notifications/send` | Send notification |
| `GET` | `/api/events/{id}/food-tokens` | List food token types |
| `POST` | `/api/events/{id}/food-tokens` | Create token type |
| `POST` | `/api/events/{id}/food-tokens/generate` | Generate tokens |
| `POST` | `/api/events/{id}/food-tokens/validate` | Validate token |
| `GET` | `/api/events/{id}/volunteers` | List volunteers |
| `GET` | `/api/events/{id}/volunteers/tasks` | List volunteer tasks |
| `POST` | `/api/events/{id}/volunteers/tasks` | Create volunteer task |
| `GET` | `/api/billing/gateways` | List payment gateways |
| `POST` | `/api/billing/gateways` | Add payment gateway |
| `DELETE` | `/api/billing/gateways/{id}` | Remove payment gateway |
| `GET` | `/api/billing/plans` | List subscription plans |
| `GET` | `/api/api-keys` | List API keys |
| `POST` | `/api/api-keys` | Create API key |
| `DELETE` | `/api/api-keys/{id}` | Revoke API key |
| `GET` | `/api/webhooks` | List webhooks |
| `POST` | `/api/webhooks` | Create webhook |

---

*This manual covers HeyPass v1.0. For the latest documentation, visit your instance URL or contact support.*
