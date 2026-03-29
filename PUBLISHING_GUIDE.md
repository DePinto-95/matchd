# SportsMeet — App Store & Google Play Publishing Guide

## Overview

This guide walks you through publishing your Expo (React Native) app to both the Apple App Store and Google Play Store. Budget approximately **2–4 weeks** for your first submission due to review times and account setup.

---

## Costs

| Item | Cost |
|---|---|
| Apple Developer Program | $99/year |
| Google Play Developer Account | $25 one-time |
| Supabase (free tier to start) | $0–$25/month |
| Expo EAS Build (free tier) | $0 (limited builds) |

---

## Phase 1 — Developer Account Setup

### Apple Developer Account
1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID (or create one)
3. Choose **Individual** or **Organization** enrollment
4. Pay the $99/year fee
5. Wait 24–48 hours for approval
6. Once approved, access App Store Connect at https://appstoreconnect.apple.com

### Google Play Developer Account
1. Go to https://play.google.com/console
2. Sign in with a Google account
3. Pay the $25 one-time registration fee
4. Fill in your developer profile
5. Account is usually active within a few hours

---

## Phase 2 — Prepare Your App for Production

### Install EAS CLI (Expo Application Services)
```bash
npm install -g eas-cli
eas login
```

### Configure app.json
Update your `app.json` with:
```json
{
  "expo": {
    "name": "SportsMeet",
    "slug": "sportsmeet",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0a0a0f"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.yourname.sportsmeet",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0a0a0f"
      },
      "package": "com.yourname.sportsmeet",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "NOTIFICATIONS",
        "CAMERA",
        "READ_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "expo-notifications",
      "expo-location",
      ["expo-image-picker", { "photosPermission": "SportsMeet uses photos for your profile picture." }]
    ]
  }
}
```

### Create eas.json
```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Required Assets to Create
- **App Icon**: 1024×1024 PNG, no rounded corners (stores add them), no transparency
- **Splash Screen**: 2048×2048 PNG
- **Android Adaptive Icon foreground**: 1024×1024 PNG (safe zone 512×512 center)
- **Screenshots**: At least 3 per device size (iPhone 6.7", iPhone 6.5", iPad, Android phone, Android tablet)
- **Feature Graphic** (Android only): 1024×500 PNG banner shown on Play Store

---

## Phase 3 — Build the App

### Build for iOS
```bash
eas build --platform ios --profile production
```
- First time: EAS will ask to create provisioning profiles and certificates automatically
- Choose "Yes" to let EAS manage credentials
- Build takes 15–30 minutes
- Output: `.ipa` file uploaded to EAS servers

### Build for Android
```bash
eas build --platform android --profile production
```
- First time: EAS creates a keystore automatically — **download and save it securely**
- Output: `.aab` (Android App Bundle) file

### Check build status
```bash
eas build:list
```

---

## Phase 4 — App Store Submission (Apple)

### In App Store Connect (https://appstoreconnect.apple.com):

1. **Create New App**
   - Platform: iOS
   - Name: SportsMeet
   - Bundle ID: com.yourname.sportsmeet (must match app.json)
   - SKU: sportsmeet-001 (internal ID, anything unique)
   - Access: Full Access

2. **Fill in App Information**
   - Category: Sports
   - Secondary Category: Social Networking
   - Age Rating: 4+ (or 12+ if you add chat)

3. **Prepare Your App Listing**
   - **Name**: SportsMeet (max 30 chars)
   - **Subtitle**: Find & join sports matches (max 30 chars)
   - **Description**: Full app description (max 4000 chars)
   - **Keywords**: football, padel, tennis, sports, match, players, 5v5, team (max 100 chars total)
   - **Support URL**: Your website or landing page
   - **Privacy Policy URL**: Required — create one at https://www.privacypolicygenerator.info
   - **Marketing URL**: Optional

4. **Upload Screenshots** for each device size (use Simulator or real device)

5. **Submit Build via EAS**
   ```bash
   eas submit --platform ios
   ```
   Or manually upload the `.ipa` via Transporter app (Mac only)

6. **Review Submission**
   - Answer export compliance questions (usually No for standard apps)
   - Add the build to your app version
   - Submit for Review
   - **Review time**: 24 hours to 7 days (average 1–2 days)

### Common iOS Rejection Reasons to Avoid
- Missing privacy policy
- App crashes on launch
- Placeholder content left in app
- Location usage not clearly justified in usage description strings
- Login required to see any content (Apple reviewers need a test account)

**Create a test account** in your app for Apple reviewers to log in with — add credentials in the "Notes" section of your App Review submission.

---

## Phase 5 — Google Play Submission

### In Google Play Console (https://play.google.com/console):

1. **Create App**
   - App name: SportsMeet
   - Default language: English (or your primary language)
   - App or Game: App
   - Free or Paid: Free (with in-app purchases possible later)

2. **Complete the Dashboard Checklist** (Play Console shows all required steps):
   - App access: All functionality is accessible (or provide login credentials)
   - Ads: Does your app contain ads? No
   - Content rating: Fill out the questionnaire → likely gets "Everyone" or "Teen"
   - Target audience: Select age groups (13+ recommended for social features)
   - News app: No
   - COVID-19 contact tracing: No
   - Data safety: Fill out what data you collect (location, name, email, photos)

3. **Store Listing**
   - Title: SportsMeet (max 30 chars)
   - Short description: Join sports matches near you (max 80 chars)
   - Full description: (max 4000 chars)
   - App icon: 512×512 PNG
   - Feature graphic: 1024×500 PNG
   - Screenshots: phone + 7-inch tablet + 10-inch tablet
   - Category: Sports
   - Tags: football, padel, tennis, team sports

4. **Upload the AAB**
   ```bash
   eas submit --platform android
   ```
   Or manually upload in Play Console → Production → Create new release

5. **Release to Production**
   - Start with a **staged rollout** (10% of users) for safety
   - Or release to all users immediately
   - **Review time**: 2–7 days for first submission, faster after that

### Data Safety Section (Required)
Be honest about:
- Location data: Collected, shared (for match finding)
- Name / username: Collected
- Email address: Collected
- Photos: Optional, collected for profile
- No financial data (until you add payments)

---

## Phase 6 — After Launch

### App Updates
```bash
# Increment version in app.json, then:
eas build --platform all --profile production
eas submit --platform all
```

### Over-the-Air Updates (JS changes only, no native changes)
```bash
eas update --branch production --message "Fix match joining bug"
```
This pushes JS updates instantly without app store review — very useful for hotfixes.

### Monitor Your App
- **Crashes**: Use Expo's built-in error reporting or add Sentry (`npx expo install @sentry/react-native`)
- **Analytics**: Add PostHog or Mixpanel for user behavior
- **Reviews**: Respond to user reviews in both stores — it improves ranking

---

## Recommended Launch Sequence

| Week | Action |
|---|---|
| Week 1 | Finish app, test on real devices, fix bugs |
| Week 2 | Create developer accounts, prepare all store assets, privacy policy |
| Week 3 | Submit to both stores, fix any rejection issues |
| Week 4 | Launch! Share with friends, sports centers, local football groups |

---

## Tips

- **Test on real devices** before submitting — simulators miss many bugs (location, camera, notifications)
- **Beta test first**: Use TestFlight (iOS) and Internal Testing (Android) to get feedback from 10–20 real users before public launch
- **ASO (App Store Optimization)**: Put your most important keywords in the title and subtitle, not just the keyword field
- **Localize early**: Swedish (`sv`) localization will help you in the Gothenburg market — add it in both stores
- **Sports centers are your growth lever**: Partner with local football pitches and padel clubs to get venue accounts set up — they bring their entire customer base to the app
