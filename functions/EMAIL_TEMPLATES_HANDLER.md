# Email Templates Handler Documentation

## 📁 Email Templates Location
```
src_new/utils/email_Templates/
├── analytics.html          (Analytics report template)
└── realTimeAlert.html      (Real-time alert template)
```

---

## 🎯 Who Handles the Email Templates?

### **Primary Handler: `emailService.ts`**

The `emailService.ts` file is the **sole handler** of the email templates. It performs three key functions:

---

## 📋 Template Handling Functions

### 1. **`loadTemplate()` Function**
**Location**: `src_new/utils/emailService.ts` (line 108)

**Purpose**: Load HTML template from file system

```typescript
function loadTemplate(templateName: EmailTemplateName): string {
  try {
    // Constructs path: __dirname/email_Templates/{templateName}.html
    const templatePath = path.join(__dirname, "email_Templates", `${templateName}.html`);
    
    // Reads the HTML file
    const template = fs.readFileSync(templatePath, "utf-8");
    
    return template;
  } catch (error) {
    logger.error(`Failed to load email template: ${templateName}`, error);
    throw new Error(`Email template not found: ${templateName}`);
  }
}
```

**What it does**:
- ✅ Reads HTML files from `email_Templates` folder
- ✅ Returns raw HTML content as string
- ✅ Throws error if template not found

---

### 2. **`injectTemplateData()` Function**
**Location**: `src_new/utils/emailService.ts` (line 120)

**Purpose**: Replace `{{placeholders}}` with actual data

```typescript
function injectTemplateData(template: string, data: Record<string, unknown>): string {
  let result = template;

  // Replace all {{key}} placeholders with actual values
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, "g");
    const stringValue = value !== null && value !== undefined ? String(value) : "";
    result = result.replace(placeholder, stringValue);
  });

  return result;
}
```

**What it does**:
- ✅ Takes raw HTML template
- ✅ Finds all `{{placeholder}}` patterns
- ✅ Replaces with actual values from data object
- ✅ Returns processed HTML ready to send

**Example**:
```html
<!-- Template -->
<h1>Hello {{recipientName}}</h1>

<!-- After injection with {recipientName: "John"} -->
<h1>Hello John</h1>
```

---

### 3. **`sendEmail()` Function**
**Location**: `src_new/utils/emailService.ts` (line 181)

**Purpose**: Orchestrate template loading, injection, and sending

```typescript
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const {to, subject, templateName, templateData, fromName} = options;

  try {
    // STEP 1: Load template
    logger.info(`[Email Service] Loading template: ${templateName}`);
    const template = loadTemplate(templateName);

    // STEP 2: Inject data into template
    const htmlContent = injectTemplateData(template, templateData);

    // STEP 3: Send via Nodemailer
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"${fromName}" <${credentials.user}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html: htmlContent, // ← Processed HTML here
    });

    logger.info(`[Email Service] Successfully sent ${templateName} email to ${to}`);
  } catch (error) {
    logger.error(`[Email Service] Failed to send ${templateName} email:`, error);
    throw error;
  }
}
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         EMAIL TRIGGER                            │
│         (Scheduler or PubSub Threshold Violation)               │
└────────────────────────┬────────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
    ┌───────▼────────┐        ┌──────▼───────┐
    │  email.ts      │        │ emailTemplates.ts │
    │  (Analytics)   │        │ (Real-Time)  │
    └───────┬────────┘        └──────┬───────┘
            │                         │
            │ Prepare templateData    │ Prepare templateData
            │ {recipientName, ...}    │ {severity, deviceName,...}
            │                         │
            └────────────┬────────────┘
                         │
                         │ Call sendEmail()
                         │
            ┌────────────▼────────────┐
            │    emailService.ts      │
            │  (TEMPLATE HANDLER)     │
            └────────────┬────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │  Load   │───▶│ Inject  │───▶│  Send   │
    │Template │    │  Data   │    │  Email  │
    └─────────┘    └─────────┘    └─────────┘
         │               │               │
         │               │               │
    Read HTML      Replace {{}}    Nodemailer
    from file      placeholders     Transport
         │               │               │
         │               │               │
    analytics.html  {{recipientName}}   Gmail
    realTimeAlert   → "John Doe"        SMTP
         │               │               │
         └───────────────┴───────────────┘
                         │
                    ✉️ Email Sent
```

---

## 📊 Template Usage

### **analytics.html** is used by:
- ✅ `config/email.ts` → `sendAnalyticsEmail()`
- ✅ Called by: `schedulers/send_DWM_Schedulers.ts`
- ✅ For: Daily/Weekly/Monthly reports

### **realTimeAlert.html** is used by:
- ✅ `utils/emailTemplates.ts` → `sendEmailNotification()`
- ✅ Called by: `pubsub/processSensorData.ts`
- ✅ For: Threshold violation alerts

---

## 🎯 Key Points

| Aspect | Details |
|--------|---------|
| **Handler** | `emailService.ts` (lines 108-212) |
| **Functions** | `loadTemplate()`, `injectTemplateData()`, `sendEmail()` |
| **Template Path** | `__dirname/email_Templates/{templateName}.html` |
| **Template Types** | `"analytics"` or `"realTimeAlert"` |
| **Technology** | Node.js `fs` module for file reading |
| **Placeholder Format** | `{{variableName}}` |
| **Replacement Method** | Regular expression: `/{{key}}/g` |

---

## 💡 Template Processing Example

### Input:
```typescript
// Template: analytics.html
<h1>Hello {{recipientName}}</h1>
<p>Total Devices: {{totalDevices}}</p>

// Data:
{
  recipientName: "John Doe",
  totalDevices: 15
}
```

### Processing Steps:
```typescript
// 1. loadTemplate("analytics")
const template = fs.readFileSync("email_Templates/analytics.html", "utf-8");
// Result: "<h1>Hello {{recipientName}}</h1><p>Total Devices: {{totalDevices}}</p>"

// 2. injectTemplateData(template, data)
template.replace(/{{recipientName}}/g, "John Doe");
template.replace(/{{totalDevices}}/g, "15");
// Result: "<h1>Hello John Doe</h1><p>Total Devices: 15</p>"

// 3. sendEmail via Nodemailer
transporter.sendMail({ html: processedHTML });
```

### Output:
```html
<h1>Hello John Doe</h1>
<p>Total Devices: 15</p>
```

---

## 🔒 File System Structure

```
functions/
└── src_new/
    └── utils/
        ├── emailService.ts         ← TEMPLATE HANDLER
        ├── emailTemplates.ts       ← Calls emailService
        └── email_Templates/        ← HTML FILES
            ├── analytics.html      ← Loaded by emailService
            └── realTimeAlert.html  ← Loaded by emailService
```

**Important**: When deployed, the `email_Templates` folder must be in the same directory as the compiled `emailService.js` file.

---

## 🛠️ Deployment Note

The templates are loaded using `path.join(__dirname, "email_Templates", ...)`, which means:

- ✅ In development: `src_new/utils/email_Templates/`
- ✅ In production: `lib/utils/email_Templates/` (after compilation)

**Make sure** the `email_Templates` folder is included in your deployment package!

---

## ✨ Summary

**Who handles the email templates?**

### **Answer: `emailService.ts`**

1. **Loads** HTML files from `email_Templates/` folder
2. **Injects** data into `{{placeholders}}`
3. **Sends** processed HTML via Nodemailer

**No other file directly accesses the template files** - all template handling is centralized in `emailService.ts` for consistency and maintainability.

---

**Location**: `src_new/utils/emailService.ts`  
**Functions**: `loadTemplate()`, `injectTemplateData()`, `sendEmail()`  
**Templates**: `email_Templates/analytics.html`, `email_Templates/realTimeAlert.html`
