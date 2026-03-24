buildscript {
    repositories {
        google()
        mavenCentral()
    }
}

plugins {
    kotlin("multiplatform") version "2.0.0" apply false
    id("com.android.application") version "8.1.0" apply false
    id("com.android.library") version "8.1.0" apply false
    id("org.jetbrains.compose") version "1.6.0" apply false
    kotlin("plugin.serialization") version "2.0.0" apply false
    kotlin("native.cocoapods") version "2.0.0" apply false
}