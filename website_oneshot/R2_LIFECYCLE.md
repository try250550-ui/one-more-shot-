# ☁️ Cloudflare R2 Lifecycle Policy Configuration

This document describes how customer photo uploads stored in Cloudflare R2 automatically expire and delete after **7 days**.

---

### 1. Programmatic Configuration via AWS SDK (`@aws-sdk/client-s3`)

You can run the built-in helper method from `server/services/r2Storage.js`:

```javascript
const { applyR2Lifecycle7DaysRule } = require('./server/services/r2Storage');

// Applies 7-day auto-expiration rule on the R2 bucket
applyR2Lifecycle7DaysRule()
    .then(() => console.log('✅ R2 7-day auto-expiration policy set!'))
    .catch(err => console.error('❌ Failed to set R2 lifecycle rule:', err));
```

---

### 2. JSON Lifecycle Configuration (S3 Standard Schema)

```json
{
  "Rules": [
    {
      "ID": "AutoExpireCustomerPhotos7Days",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "Expiration": {
        "Days": 7
      }
    }
  ]
}
```

---

### 3. AWS CLI Command

If you manage your R2 bucket via the AWS CLI or wrangler:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket $R2_BUCKET \
  --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com \
  --lifecycle-configuration file://lifecycle.json
```

---

### 4. Cloudflare Dashboard Instructions

1. Log into your **Cloudflare Dashboard** -> **R2 Object Storage**.
2. Select your bucket (`one-more-shot-uploads`).
3. Click on the **Settings** tab.
4. Scroll to **Object Lifecycle Rules** and click **Add Rule**.
5. Set:
   - **Rule Name**: `AutoExpireCustomerPhotos7Days`
   - **Filter**: All objects
   - **Action**: Delete objects
   - **Duration**: `7` days after upload.
6. Click **Save Rule**.
