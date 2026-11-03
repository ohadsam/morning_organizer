plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

// One version for everything: web/version.json drives the PWA, the service worker cache and this APK.
@Suppress("UNCHECKED_CAST")
val webVersion = groovy.json.JsonSlurper().parse(file("../../web/version.json")) as Map<String, Any>

// Release signing comes from the environment (GitHub Actions secrets). Without it the APK is signed with the
// per-machine debug key: it installs fine, but cannot update an APK signed with a different key.
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
        if (keystorePath != null) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KEY_ALIAS")
                keyPassword = System.getenv("KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = if (keystorePath != null) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
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
    testImplementation(libs.junit)
}
