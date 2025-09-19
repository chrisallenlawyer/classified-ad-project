# 🔧 Supabase Custom Email Configuration

## 🎯 **Goal**: Replace Supabase default emails with custom Bama Classifieds emails

### **Issues to Fix:**
1. ❌ **Signup confirmation emails** come from Supabase with generic branding
2. ❌ **Password reset emails** redirect to wrong/test site URLs
3. ❌ **No brand consistency** with your custom email templates

## 🛠️ **Solution: Configure Supabase Auth Settings**

### **Step 1: Update Supabase Auth Configuration**

Go to your **Supabase Dashboard** → **Authentication** → **Settings** → **Email Templates**

#### **A. Disable Default Email Confirmations (Recommended)**
1. **Turn off "Enable email confirmations"** in Auth settings
2. This prevents Supabase from sending default signup emails
3. Handle email confirmation through your custom service

#### **B. OR Update Email Templates (Alternative)**
If you prefer to keep Supabase emails but customize them:

1. **Signup Confirmation Template:**
```html
<h2>Welcome to Bama Classifieds!</h2>
<p>Hi there!</p>
<p>Thank you for joining Bama Classifieds, Alabama's premier marketplace.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email address</a></p>
<p>© 2025 Bama Classifieds. All rights reserved.</p>
```

2. **Password Reset Template:**
```html
<h2>Reset Your Bama Classifieds Password</h2>
<p>Hi there!</p>
<p>We received a request to reset your password.</p>
<p><a href="{{ .PasswordResetURL }}">Reset your password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>© 2025 Bama Classifieds. All rights reserved.</p>
```

### **Step 2: Update Site URL Configuration**

In **Supabase Dashboard** → **Settings** → **API**:

1. **Update Site URL:**
   - Change from test URL to: `https://bamaclassifieds.com`
   - Or your actual production domain

2. **Update Redirect URLs:**
   - Add: `https://bamaclassifieds.com/reset-password`
   - Add: `https://bamaclassifieds.com/login`
   - Add: `https://bamaclassifieds.com/**` (wildcard for all pages)

### **Step 3: Recommended Approach - Custom Email Handling**

**Disable Supabase emails entirely and use our custom service:**

1. **In Supabase Dashboard:**
   - Authentication → Settings
   - **Disable "Enable email confirmations"**
   - **Disable "Enable password recovery"**

2. **Handle in Application Code:**
   - Use our custom `sendSignupConfirmationEmail()` function
   - Use our custom `sendPasswordResetEmail()` function
   - Full control over branding and user experience

## 🔧 **Implementation Options**

### **Option 1: Disable Supabase Emails (Recommended)**

**Pros:**
- ✅ Complete control over email branding
- ✅ Consistent with your existing email templates  
- ✅ No dependency on Supabase email configuration
- ✅ Better analytics and tracking

**Cons:**
- ❌ Need to handle email confirmation logic manually
- ❌ More complex implementation

### **Option 2: Customize Supabase Templates**

**Pros:**
- ✅ Easier implementation
- ✅ Built-in email confirmation flow
- ✅ Automatic URL generation

**Cons:**
- ❌ Limited customization options
- ❌ Less control over email timing
- ❌ Inconsistent with your custom email service

## 🚀 **Quick Fix for Immediate Issues**

### **For Password Reset URLs:**
1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Update **Site URL** to your production domain
3. Add your production domain to **Redirect URLs**

### **For Email Branding:**
1. Go to **Authentication** → **Email Templates**
2. Update the templates with Bama Classifieds branding
3. Use the HTML templates I provided above

## 🎯 **Recommendation**

**Use Option 1 (Disable Supabase Emails)** because:
- You already have beautiful custom email templates
- Complete brand consistency
- Better integration with your existing email service
- More flexibility for future enhancements

Would you like me to implement the custom email confirmation flow, or would you prefer to update the Supabase templates first as a quicker fix?
