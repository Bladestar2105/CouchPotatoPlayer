plugins {
    kotlin("multiplatform")
    id("com.android.application")
    id("org.jetbrains.compose")
    kotlin("plugin.compose")
    kotlin("native.cocoapods")
}

kotlin {
    wasmJs {
        moduleName = "composeApp"
        browser {
            commonWebpackConfig {
                outputFileName = "composeApp.js"
            }
        }
        binaries.executable()
    }

    androidTarget {
        compilations.all {
            kotlinOptions {
                jvmTarget = "1.8"
            }
        }
    }

    cocoapods {
        summary = "ComposeApp UI module"
        homepage = "https://github.com/couchpotatoplayer"
        version = "1.0.0"
        ios.deploymentTarget = "14.0"
        osx.deploymentTarget = "11.0"
        tvos.deploymentTarget = "14.0"

        pod("MobileVLCKit") {
            version = "~> 3.5.1"
        }

        framework {
            baseName = "ComposeApp"
            isStatic = true
        }
    }

    listOf(
        iosX64(),
        iosArm64(),
        iosSimulatorArm64(),
        tvosX64(),
        tvosArm64(),
        tvosSimulatorArm64()
    ).forEach { target ->
        target.binaries.framework {
            baseName = "ComposeApp"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation(project(":shared"))
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.ui)
            implementation(compose.components.resources)
            implementation(compose.components.uiToolingPreview)
            // Lifecycle and ViewModel
            implementation("org.jetbrains.androidx.lifecycle:lifecycle-viewmodel-compose:2.8.0")
            // Navigation (e.g. Voyager)
            implementation("cafe.adriel.voyager:voyager-navigator:1.0.0")
            implementation("cafe.adriel.voyager:voyager-transitions:1.0.0")
        }

        androidMain.dependencies {
            implementation("androidx.compose.ui:ui-tooling:1.6.0")
            implementation("androidx.activity:activity-compose:1.8.2")

            // VLC for Android / Android TV
            implementation("org.videolan.android:libvlc-all:3.6.0-eap4")
        }

        val wasmJsMain by getting {
            dependencies {
                implementation(compose.html.core)
            }
        }
    }
}

android {
    namespace = "com.couchpotatoplayer.composeapp"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.couchpotatoplayer.composeapp"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}