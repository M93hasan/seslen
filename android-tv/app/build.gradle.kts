plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
 namespace = "site.serula.seslen"
 compileSdk = 35
 buildToolsVersion = "35.0.0"
 defaultConfig { applicationId = "site.serula.seslen"; minSdk = 26; targetSdk = 34; versionCode = 5; versionName = "0.4.1-test" }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
}
dependencies { implementation("com.google.zxing:core:3.5.3"); testImplementation("junit:junit:4.13.2") }

