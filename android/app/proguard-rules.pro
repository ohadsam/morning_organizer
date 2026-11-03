# The web bridge is called by name from JavaScript.
-keepclassmembers class com.morningorganizer.app.NativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes *Annotation*
