# Step-by-Step Sign Up Guide for Customers and Pros

## 📋 Overview

Both customers and pros use the same signup page (`/signin`) but with different roles. The process is streamlined and role-specific.

---

## 👤 CUSTOMER SIGN UP - Step by Step

### Step 1: Navigate to Sign Up Page
- **Option A**: Go to homepage (`/`) and click **"Get Started"** button
- **Option B**: Go directly to `/signin?role=customer&mode=signup`
- **Option C**: Go to `/signin`, then:
  - Click **"Customer"** tab (if not already selected)
  - Click **"Create Account"** tab

### Step 2: Select Customer Role
- The page shows **"👤 Customer Account"** badge at the top
- Ensure **"Customer"** tab is selected (should be green/emerald colored)
- If not, click the **"Customer"** tab

### Step 3: Switch to Sign Up Mode
- Click the **"Create Account"** tab (should be white/active)
- The heading changes to **"Create your account"**
- Description shows: **"Sign up as a customer"**

### Step 4: Fill Out Sign Up Form
- **Email**: Enter your email address (e.g., `customer@example.com`)
- **Password**: Enter a password (minimum 6 characters)
- Both fields are required

### Step 5: Submit Form
- Click the **"Continue"** button (green/emerald colored)
- The form validates and creates your account

### Step 6: Account Creation Process
Behind the scenes, the system:
1. ✅ Creates an auth user in Supabase
2. ✅ Creates a profile row with `role='customer'`
3. ✅ Stores user data in localStorage

### Step 7: Redirect to Dashboard
- Automatically redirected to **`/dashboard/customer`**
- You're now logged in as a customer
- Can browse services, book pros, view bookings, etc.

### Step 8: Complete Profile (Optional)
- Go to **Settings** → **Account Settings** (`/settings/account`)
- Update your full name, phone number, etc.
- This is optional - you can start booking immediately

---

## 🔧 SERVICE PRO SIGN UP - Step by Step

### Step 1: Navigate to Sign Up Page
- **Option A**: Go to homepage (`/`) and click **"Get Started"** button, then select **"Service Pro"**
- **Option B**: Go directly to `/signin?role=pro&mode=signup`
- **Option C**: Go to `/signin`, then:
  - Click **"Service Pro"** tab
  - Click **"Create Account"** tab

### Step 2: Select Pro Role
- The page shows **"🔧 Service Pro Account"** badge at the top
- Ensure **"Service Pro"** tab is selected (should be orange/amber colored)
- If not, click the **"Service Pro"** tab

### Step 3: Switch to Sign Up Mode
- Click the **"Create Account"** tab (should be white/active)
- The heading changes to **"Create your account"**
- Description shows: **"Sign up as a service professional"**

### Step 4: Fill Out Sign Up Form
- **Email**: Enter your email address (e.g., `pro@example.com`)
- **Password**: Enter a password (minimum 6 characters)
- Both fields are required

### Step 5: Submit Form
- Click the **"Continue"** button (orange/amber colored)
- The form validates and creates your account

### Step 6: Account Creation Process
Behind the scenes, the system:
1. ✅ Creates an auth user in Supabase
2. ✅ Creates a profile row with `role='pro'`
3. ✅ Creates a basic `service_pros` row with:
   - Default category (first available category)
   - Display name = email prefix
   - Starting price = $0
   - Available = false (you need to set up your business first)
   - Location = "Not set"

### Step 7: Redirect to Dashboard
- Automatically redirected to **`/dashboard/pro`**
- You're now logged in as a pro
- You'll see a basic dashboard with placeholder data

### Step 8: Set Up Your Business Profile (REQUIRED)
This is the most important step for pros:

1. **Go to Settings → My Business**
   - Navigate to `/settings/business`
   - Or click **"My Business"** from the pro dashboard

2. **Fill Out Business Information**:
   - **Business Name*** (required): Your business or display name
   - **About/Bio**: Description of your services and experience
   - **Service Category*** (required): Select from dropdown:
     - Cleaning 🧹
     - Plumbing 🔧
     - Lawn Care 🌿
     - Handyman 🔨
     - Photographer 📸
     - HVAC ❄️
     - Roofing 🏠
     - Pest Control 🐛
     - Carpet Cleaning 🧽
     - Landscaping 🌳
   - **Starting Price*** (required): Your base service price in dollars
   - **Service Radius** (optional): How far you're willing to travel (miles)
   - **Business Hours** (optional): e.g., "Mon-Fri: 9am-5pm, Sat: 10am-2pm"

3. **Save Changes**
   - Click **"Save Changes"** button
   - Your business profile is now active
   - Set `available = true` to start receiving bookings

### Step 9: Set Availability (Optional but Recommended)
- In your business settings, make sure your profile is set to **available**
- This allows customers to find and book you

### Step 10: Add Service Add-Ons (Optional)
- Go to **Pro Dashboard** → **Add-Ons** (`/pro/addons`)
- Create up to 4 active add-ons per service category
- Add-ons are optional services customers can select during checkout

---

## 🔄 SIGN IN (Existing Users)

### For Both Customers and Pros:

1. **Navigate to Sign In**
   - Go to `/signin`
   - Or click **"Sign In"** from homepage

2. **Select Your Role**
   - Click **"Customer"** or **"Service Pro"** tab

3. **Enter Credentials**
   - Email: Your registered email
   - Password: Your password

4. **Sign In**
   - Click **"Continue"** button
   - Redirected to your respective dashboard:
     - Customers → `/dashboard/customer`
     - Pros → `/dashboard/pro`

---

## 🧪 Test Credentials

For development/testing, the signin page shows:
- **Email**: `test@example.com`
- **Password**: `123456`

These are pre-filled in the form for quick testing.

---

## 📍 Important URLs

### Sign Up Pages:
- Customer Sign Up: `/signin?role=customer&mode=signup`
- Pro Sign Up: `/signin?role=pro&mode=signup`

### Sign In Page:
- General Sign In: `/signin`

### Dashboards:
- Customer Dashboard: `/dashboard/customer`
- Pro Dashboard: `/dashboard/pro`

### Settings:
- Account Settings: `/settings/account`
- Business Settings (Pro only): `/settings/business`
- Add-Ons (Pro only): `/pro/addons`

---

## ⚠️ Important Notes

### For Customers:
- ✅ Can start booking immediately after signup
- ✅ No additional setup required
- ✅ Can update profile anytime in Settings

### For Pros:
- ⚠️ **Must complete business profile** before receiving bookings
- ⚠️ **Must select a service category** (required field)
- ⚠️ **Must set a starting price** (required field)
- ⚠️ **Must set availability to true** to appear in search results
- ✅ Can add service add-ons after setting up business
- ✅ Can update business details anytime

---

## 🎯 Quick Start Checklist for Pros

After signing up as a pro, complete these steps:

- [ ] Sign up with email and password
- [ ] Go to Settings → My Business
- [ ] Enter Business Name
- [ ] Select Service Category
- [ ] Set Starting Price
- [ ] Add Bio/Description (optional but recommended)
- [ ] Set Service Radius (optional)
- [ ] Set Business Hours (optional)
- [ ] Save Changes
- [ ] Verify profile appears in category search
- [ ] (Optional) Add service add-ons
- [ ] (Optional) Upload credentials/verifications

---

## 🔗 Related Files

- **Sign In/Sign Up Page**: `app/signin/page.tsx`
- **Auth API**: `lib/api.ts` (signUp, signIn functions)
- **Business Settings**: `app/settings/business/page.tsx`
- **Customer Dashboard**: `app/dashboard/customer/page.tsx`
- **Pro Dashboard**: `app/dashboard/pro/page.tsx`

---

## 💡 Tips

1. **For Pros**: Complete your business profile as soon as possible to start receiving bookings
2. **Email Verification**: In production, Supabase may require email verification
3. **Password Strength**: Use a strong password (6+ characters minimum)
4. **Profile Completion**: The more complete your profile, the more bookings you'll get
5. **Service Category**: Choose the category that best matches your primary service






