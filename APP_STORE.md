# Deploying SportzLabs to the Apple App Store

This project is configured as a Capacitor iOS app. Capacitor wraps the existing web app in a native iPhone app that can be opened in Xcode and submitted to App Store Connect.

## One-time setup

1. Install Xcode from the Mac App Store.
2. Install Node dependencies:

   ```sh
   npm install
   ```

3. Create the iOS project:

   ```sh
   npm run ios:add
   ```

4. Open the iOS project:

   ```sh
   npm run ios:open
   ```

## App Store settings in Xcode

In Xcode, select the `App` project and set:

- Bundle Identifier: `com.sportzlabs.performancelab`
- Display Name: `SportzLabs`
- Team: your Apple Developer account
- Version: your public version, for example `1.0.0`
- Build: increment this every upload, for example `1`
- Deployment target: keep Xcode's default unless App Store Connect asks you to change it

Use the files in `icons/` as the basis for the app icon. Xcode requires PNG icons in its AppIcon asset set, so export the SVG icon to the required PNG sizes through Xcode, Preview, Figma, or another image tool.

## Supabase redirect URLs

For email verification and password reset links, Supabase must allow the web app URL and the native app URL.

In Supabase, go to Authentication > URL Configuration and add:

- `https://www.sportzlabs.com/`
- `https://sportzlabs.com/`
- `https://localhost/`

Keep the current hosted site URL as the primary redirect if you want email links to open the web app first. Native deep linking can be added later with Associated Domains if you want links to open directly inside the installed app.

## Rebuild after changes

Whenever the web app changes, run:

```sh
npm run ios:sync
```

Then open Xcode again if it is not already open:

```sh
npm run ios:open
```

## Upload to App Store Connect

1. In Xcode, choose `Any iOS Device`.
2. Go to Product > Archive.
3. When the archive finishes, choose Distribute App.
4. Select App Store Connect.
5. Upload the build.
6. In App Store Connect, create the app listing, add screenshots, privacy details, age rating, support URL, and submit for review.

## Review note

Apple can reject apps that are only a thin website wrapper. SportzLabs has login, analytics, player comparison, saved app navigation, and generated sports data, which helps. Before submission, add polished screenshots, a support URL, privacy policy URL, and a short reviewer note explaining that the app provides AFL performance analytics, player comparison, PAV charts, and curated news.
