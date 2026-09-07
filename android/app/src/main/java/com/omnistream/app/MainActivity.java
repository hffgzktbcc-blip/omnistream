package com.omnistream.app;

import android.os.Bundle;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public class AndroidTVBridge {
        @JavascriptInterface
        public void clickCenter() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    simulateCenterClick();
                }
            });
        }

        @JavascriptInterface
        public boolean isTV() {
            return true;
        }
    }

    private void simulateCenterClick() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                long now = SystemClock.uptimeMillis();
                float x = webView.getWidth() / 2.0f;
                float y = webView.getHeight() / 2.0f;
                MotionEvent down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, x, y, 0);
                MotionEvent up = MotionEvent.obtain(now, now + 50, MotionEvent.ACTION_UP, x, y, 0);
                webView.dispatchTouchEvent(down);
                webView.dispatchTouchEvent(up);
                down.recycle();
                up.recycle();
            }
        } catch (Exception ignored) {}
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
            settings.setJavaScriptCanOpenWindowsAutomatically(true);

            // Register JS Bridge for TV remote actions
            webView.addJavascriptInterface(new AndroidTVBridge(), "AndroidTVBridge");
        }
    }
}
