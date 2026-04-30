# Attendance Site Field Enhancement

## Overview
Enhanced the attendance submodule's new record form to fetch site details from biometric sites (stored in superadmin database) with support for custom values.

## Changes Made

### 1. **Created New API Endpoint**
- **Path**: `/api/biometric/sites-list/route.ts`
- **Purpose**: Fetch active biometric sites from the superadmin database for the current tenant
- **Authentication**: Uses tenant ID from cookies (`erp_tenant_id`)
- **Returns**: Array of sites with `id`, `siteId`, and `siteName`

**Why a new endpoint?**
- The existing `/api/biometric/config` endpoint queries the tenant database
- Biometric sites are actually stored in the **superadmin database** (`BiometricSiteConfig` model)
- The biometric sync module uses `superadminDb.biometricSiteConfig` to fetch configurations
- This new endpoint correctly queries the superadmin database where "test office 1" and other sites are configured

### 2. **Added Biometric Sites Integration**
- Added state to store biometric sites: `biometricSites`
- Added state to track custom site mode: `customSiteMode`
- Created `fetchBiometricSites()` function to fetch active biometric sites from `/api/biometric/sites-list`
- Added console logging for debugging site fetch operations

### 3. **Enhanced Site Field UI**
The site field now features a dual-mode interface:

#### **Select Mode** (Default)
- Displays a dropdown with all active biometric sites
- Shows site name and site ID: `{siteName} ({siteId})`
- Automatically populated from the biometric configuration
- Helpful message indicates if no sites are configured

#### **Custom Mode**
- Provides a text input for entering any custom site value
- Useful for manual entries or sites not in the biometric system
- Allows complete flexibility

### 3. **Mode Toggle Buttons**
- Two toggle buttons above the input: "Select Site" and "Custom Value"
- Active button highlighted with orange background (`#f5a623`)
- Inactive buttons have subtle hover effects
- Smooth transitions between modes

### 4. **Smart Mode Detection on Edit**
- When editing an existing record, the form automatically detects if the site value matches a biometric site
- If it matches: Opens in "Select Mode" with the site pre-selected
- If it doesn't match: Opens in "Custom Mode" with the custom value displayed

### 5. **User Experience Improvements**
- Contextual help text below the field explains the current mode
- Clear indication when no biometric sites are configured
- Seamless switching between modes without losing data
- Optional field - no validation errors if left empty

## Technical Details

### Database Architecture
The biometric sites are stored in the **superadmin database**, not the tenant database:
- **Superadmin DB**: `BiometricSiteConfig` model stores all biometric site configurations per tenant
- **Tenant DB**: Does NOT store biometric site configs (this was the source of the initial issue)
- The biometric sync module uses `superadminDb.biometricSiteConfig.findMany()` to fetch sites

### API Endpoints

#### New Endpoint: `/api/biometric/sites-list`
```typescript
GET /api/biometric/sites-list
```

**Purpose**: Fetch active biometric sites for the current tenant from superadmin database

**Authentication**: 
- Reads `erp_tenant_id` from cookies
- Returns 401 if not authenticated

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cuid123",
      "siteId": "site1",
      "siteName": "test office 1"
    }
  ]
}
```

**Query**:
```typescript
await superadminDb.biometricSiteConfig.findMany({
  where: { tenantId, isActive: true },
  orderBy: { createdAt: 'asc' },
  select: { id: true, siteId: true, siteName: true }
})
```

#### Existing Endpoint: `/api/biometric/config`
- Queries the **tenant database** (not superadmin)
- Used for managing tenant-specific biometric configs (different use case)
- NOT used by the attendance form

### State Management
```typescript
const [biometricSites, setBiometricSites] = useState<{ 
  id: number; 
  siteId: string; 
  siteName: string 
}[]>([]);
const [customSiteMode, setCustomSiteMode] = useState(false);
```

### Form Behavior
- **Create Mode**: Defaults to "Select Mode" with empty selection
- **Edit Mode**: Intelligently chooses mode based on existing value
- **Mode Reset**: Switching modes preserves the current value

## Benefits

1. **Integration**: Seamlessly integrates with the biometric system
2. **Flexibility**: Supports both predefined and custom site values
3. **User-Friendly**: Clear UI with helpful guidance
4. **Smart**: Automatically detects the appropriate mode when editing
5. **Optional**: Field remains optional, no breaking changes to existing workflows

## Usage Example

### Creating a New Record
1. Click "New Record" button
2. Fill in employee and date
3. For site field:
   - **Option A**: Click "Select Site" and choose from dropdown
   - **Option B**: Click "Custom Value" and type any site name
4. Complete other fields and save

### Editing an Existing Record
1. Click edit icon on any attendance record
2. Site field automatically opens in the correct mode:
   - If site matches a biometric site → "Select Mode"
   - If site is custom → "Custom Mode"
3. Switch modes if needed
4. Update and save

## Future Enhancements
- Add site search/filter for large lists
- Show site status indicators (online/offline)
- Add quick "Add New Site" button that opens biometric settings
- Support for site groups or categories
