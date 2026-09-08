package com.omnistream.app;

import android.os.Bundle;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public class AndroidTVBridge {
        @JavascriptInterface
        public boolean isTV() {
            return true;
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        configureWebView();
    }

    @Override
    public boolean dispatchKeyEvent(android.view.KeyEvent event) {
        if (event.getAction() == android.view.KeyEvent.ACTION_DOWN) {
            if (event.getKeyCode() == android.view.KeyEvent.KEYCODE_BACK) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('android-back-press'));", null);
                    return true;
                }
            }
        }
        return super.dispatchKeyEvent(event);
    }

    private void configureWebView() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            
            // Allow media playback without requiring user touch gesture (critical for Android TV)
            settings.setMediaPlaybackRequiresUserGesture(false);
            
            // Enable spatial navigation for D-pad directional navigation
            settings.setSupportSpatialNavigation(true);
            
            // Enable DOM storage and JS
            settings.setDomStorageEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(false);

            // Block all unrequested downloads to prevent Downloader app from opening
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    // Swallow download request so external Downloader app is NEVER triggered
                }
            });

            // Register JS Bridge for TV detection
            webView.addJavascriptInterface(new AndroidTVBridge(), "AndroidTVBridge");
        }
    }
}
