plugins {
    kotlin("multiplatform")
    id("com.android.library")
    kotlin("plugin.serialization")
}

kotlin {
    androidTarget {
        compilations.all {
            kotlinOptions {
                jvmTarget = "1.8"
            }
        }
    }

    listOf(
        iosX64(),
        iosArm64(),
        iosSimulatorArm64()
    ).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "shared"
            isStatic = true
        }
    }

    // Experimental TVOS support can be added later
    // tvosX64(),
    // tvosArm64(),
    // tvosSimulatorArm64()

    sourceSets {
        commonMain.dependencies {
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
            implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.0") // Needed for EpgParser
            // XML Parser for KMP (alternative to Fast XML Parser)
            implementation("io.github.pdvrieze.xmlutil:core:0.86.3")
            implementation("io.github.pdvrieze.xmlutil:serialization:0.86.3")
            // Settings storage (alternative to AsyncStorage / expo-file-system)
            implementation("com.russhwolf:multiplatform-settings:1.1.1")
        }
    }
}

android {
    namespace = "com.couchpotatoplayer.shared"
    compileSdk = 34
    defaultConfig {
        minSdk = 24
    }
}