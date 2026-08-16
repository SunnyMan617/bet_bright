# iOS / IPA path

No domain, API, or UI rewrite is needed for iOS because the Flutter code is platform-neutral and the backend is HTTPS JSON.

1. On macOS with Xcode and Flutter installed, run `flutter create --platforms ios --org com.betbridge --project-name betbridge_mobile .` in `mobile_flutter`.
2. Set a unique Runner bundle identifier and the Apple Development Team in Xcode.
3. Keep the production API on HTTPS; no App Transport Security exception is then required.
4. Run `flutter test` and test loading fresh, invalid, expired, and live-event codes on a physical iPhone.
5. Build with `flutter build ipa --release --dart-define=API_BASE_URL=https://your-live-url.example`.
6. Upload the archive to TestFlight/App Store Connect, or use Firebase App Distribution with an Apple Ad Hoc/Development profile whose device list includes the reviewers.

For App Store review, the independent-product disclaimer and responsible-gambling note remain visible. No gambling transaction occurs in the app; it only reads booking-slip data.
