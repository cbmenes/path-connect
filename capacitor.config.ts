import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native iOS and Android shell around the existing Path Connect web client.
 *
 * The website build is unchanged. `npm run build:native` writes a static copy
 * of that client to `dist/client`, and `npx cap sync` copies it into the
 * Android and iOS projects. Those copies are build output and are not kept in
 * git, so run `npm run cap:sync` before opening Android Studio or Xcode.
 * Each WebView then loads that copy from the device.
 * There is no remote `server.url`, and no ad plugin.
 *
 * The WebView origin is a secure local host (`https://localhost` on Android,
 * `capacitor://localhost` on iOS). Progress and the hidden unlock flag use the
 * same localStorage keys and the same `?dev=unlock-all` rule as the website.
 * That storage belongs to the app, so it is not shared with the mobile browser.
 *
 * Still to do before a store submission:
 * - Replace the default app icons. Android uses mipmap resources, iOS uses the
 *   AppIcon asset catalog. The website favicon is not a store icon.
 * - Add splash screens for phone and tablet. The generated launch screen is only
 *   a placeholder.
 * - Keep `com.cbmenes.pathconnect` only if that is the final publisher id. It
 *   becomes the iOS bundle id and the Android application id, and a published
 *   id cannot be changed for the same listing.
 * - iOS: Apple Developer Program, signing certificate, provisioning profile,
 *   privacy labels, screenshots, and a check that the board clears the status
 *   bar and home indicator on a real device.
 * - Android: Play Console, an upload keystore you can keep, the target SDK Play
 *   currently requires, screenshots, and the data-safety form.
 * - Do not add AdMob, or any other ad plugin, until that account is verified.
 *   The web ad flow is untouched and is not connected to a native ad SDK.
 * - Open a release build on a device before submitting. This repo cannot
 *   compile the Xcode or Gradle projects by itself.
 */
const config: CapacitorConfig = {
  appId: "com.cbmenes.pathconnect",
  appName: "Path Connect",
  webDir: "dist/client",
  // Matches the page background so the WebView does not flash white before the client paints.
  backgroundColor: "#f6f1e8",
  server: {
    // Defaults, set on purpose. https on Android keeps routing and query
    // strings working. localhost is a secure context, so localStorage works.
    androidScheme: "https",
    hostname: "localhost",
  },
  plugins: {
    // The launch screen alone vanishes before the game paints, leaving the
    // cream WebView. This holds the same Splash artwork over it for a moment.
    // PathConnectViewController (ios/App/App/SceneDelegate.swift) shows the
    // same image for the same time, so a stale build or cache still shows it.
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#d8eee3",
      showSpinner: false,
    },
  },
};

export default config;
