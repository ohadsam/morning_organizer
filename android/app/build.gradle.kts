plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

// One version for everything: web/version.json drives the PWA, the service worker cache and this APK.
@Suppress("UNCHECKED_CAST")
val webVersion = groovy.json.JsonSlurper().parse(file("../../web/version.json")) as Map<String, Any>

// Release signing. Default: the committed shared key (android/app/morning-organizer.keystore), so every APK built from this repo
// has the same signature and installs as an in-place update. A personal side-loaded app has no store account to protect, so
// secrecy is traded for update-compatibility (docs/RELEASING.md). To use a private key instead, set the KEYSTORE_* secrets.
val keystorePath: String? = System.getenv("KEYSTORE_FILE")

android {
    namespace = "com.morningorganizer.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.morningorganizer.app"
        minSdk = 26
        targetSdk = 34
        versionCode = (webVersion["versionCode"] as Number).toInt()
        versionName = webVersion["version"] as String
    }

    signingConfigs {
        create("release") {
            storeFile = file(keystorePath ?: "morning-organizer.keystore")
            storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "morningorganizer"
            keyAlias = System.getenv("KEY_ALIAS") ?: "morning"
            keyPassword = System.getenv("KEY_PASSWORD") ?: "morningorganizer"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
        debug { applicationIdSuffix = ".debug" }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = true }

    // The web app is the single source of UI: its files are packaged as assets, no copy step, no duplicate.
    sourceSets["main"].assets.srcDir("../../web")

    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }

    lint {
        abortOnError = true
        warningsAsErrors = false
        checkReleaseBuilds = false
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.webkit)
    implementation(libs.androidx.fragment) // the code scanner pulls an old Fragment; ActivityResult launchers need >= 1.3 (lint InvalidFragmentVersionForActivityResult)
    implementation(libs.androidx.codescanner) // Google's code scanner: no camera permission, no bundled model
    testImplementation(libs.junit)
}
