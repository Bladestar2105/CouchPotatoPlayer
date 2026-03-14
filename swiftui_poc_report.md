# SwiftUI Migration Proof of Concept (PoC) Report

## Objective
Evaluate the feasibility of migrating the current Flutter-based CouchPotatoPlayer app to a single SwiftUI codebase that natively targets iOS, tvOS, Android, Android TV, and Web.

## Overview
Currently, the CouchPotatoPlayer app is 100% migrated to Flutter, offering a unified codebase across mobile, TV, and web platforms. The question is whether it's possible to adopt SwiftUI as the primary framework and still support this exact matrix of platforms natively.

## Available Tooling & Frameworks

### 1. Skip.dev
**Overview:** Skip is a recently open-sourced framework that transpiles Swift to Kotlin and converts SwiftUI code to Jetpack Compose for Android.
- **iOS / tvOS:** Fully native, as it uses standard Swift/SwiftUI.
- **Android / Android TV:** Transpiles to native Kotlin and Jetpack Compose. Since it generates standard Android UI code, Android TV support is technically possible via Compose for TV, though custom bridging might be needed for specific TV-only APIs.
- **Web:** **Not Supported.** Skip focuses exclusively on creating native iOS and Android apps.

### 2. Tokamak / SwiftWasm
**Overview:** Tokamak is a SwiftUI-compatible framework that leverages SwiftWasm to compile Swift code into WebAssembly, running inside browsers.
- **Web:** Supported via WebAssembly and HTML/DOM rendering.
- **iOS / tvOS:** Supported by falling back to native SwiftUI (via `TokamakShim`).
- **Android / Android TV:** **Not Supported.** Tokamak is not designed to compile SwiftUI into native Android views. While technically one could run a WebAssembly app inside an Android WebView, this defeats the purpose of a *native* cross-platform framework and results in degraded performance and UX.

### 3. Native Swift for Android (Without UI Abstraction)
**Overview:** The Swift toolchain now officially supports compiling Swift code for the Android execution environment.
- However, this only applies to business logic, networking, and data layers.
- UI layers still require native implementations (e.g., UIKit/SwiftUI for iOS, Views/Compose for Android). Therefore, it is impossible to write the UI *once* in SwiftUI and have it run natively on Android without a transpiler like Skip.

## Feasibility Matrix

| Platform    | Supported via Single SwiftUI Codebase? | Framework / Tool Required       |
|-------------|----------------------------------------|---------------------------------|
| **iOS**     | Yes (Native)                           | Apple SDK                       |
| **tvOS**    | Yes (Native)                           | Apple SDK                       |
| **Android** | Yes (Via Transpilation)                | Skip.dev (SwiftUI -> Compose)   |
| **Android TV**| Yes (Via Transpilation)              | Skip.dev (Compose for TV)       |
| **Web**     | Yes (Via WebAssembly)                  | Tokamak + SwiftWasm             |

## Conclusion

**Is a single SwiftUI codebase viable for ALL requested platforms?**
**No.**

Currently, there is no single framework or toolchain that can take a single SwiftUI codebase and deploy it natively to iOS, Android, and Web simultaneously.

To achieve the requested platform matrix using Swift/SwiftUI, the architecture would have to be fragmented:
1. **Shared Business Logic:** Written in Swift.
2. **Mobile/TV UI (iOS, tvOS, Android, Android TV):** Written in SwiftUI, utilizing **Skip.dev** to transpile the UI to Jetpack Compose for the Android platforms.
3. **Web UI:** Must be either rewritten using HTML/JS/CSS, or built using a separate SwiftUI-compatible framework like **Tokamak** specifically for the web build target.

### Recommendation
**Do not migrate to SwiftUI at this time.**

The current Flutter implementation perfectly satisfies the requirement of a single UI codebase deploying to iOS, tvOS, Android, Android TV, and Web natively/efficiently. Moving to SwiftUI would introduce massive fragmentation, require relying on third-party transpilation tools (Skip.dev), and force maintaining separate web-specific implementations (Tokamak), significantly increasing technical debt and development time. Flutter remains the optimal choice for this specific cross-platform matrix.