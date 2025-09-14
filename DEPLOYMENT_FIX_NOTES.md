# Vercel Deployment Fix - How to Resolve "Unknown" User Error

## Problem
Vercel was sending emails saying "Unknown is attempting to deploy" and blocking all deployments, even though GitHub was connected.

## Root Cause
The issue was a **Git email mismatch** between:
- Git configuration: `chrisallenlaw@gmail.com` (incorrect)
- Vercel account: `chrisallenlawyer@gmail.com` (correct)

## Solution Steps

### 1. Fix Git Email Configuration
```bash
git config --global user.email "chrisallenlawyer@gmail.com"
```

### 2. Verify Git Configuration
```bash
git config --global user.name
git config --global user.email
```

### 3. Test with Simple Push
```bash
echo "test" > test.txt
git add test.txt
git commit -m "simple test"
git push
```

## Why This Worked
- Vercel matches commits to user accounts by email address
- When emails don't match, Vercel sees the user as "Unknown"
- Fixing the email alignment resolved the permission issue
- No need to delete/reimport Vercel projects

## Prevention
- Always ensure Git email matches Vercel account email
- Check `git config --global user.email` before starting new projects
- If deployment issues occur, check email alignment first

## Alternative Solutions (if email fix doesn't work)
1. Make repository public
2. Disconnect/reconnect GitHub in Vercel
3. Check Vercel branch settings (ensure it's set to "main")

## Date Fixed
September 14, 2024

## Project
Classified Ad Project - bamaclassifieds.com
