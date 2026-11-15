package com.cbmenes.pathconnect;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        WebSettings settings = webView.getSettings();
        // Some System WebViews ignore the viewport meta tag until the wide
        // viewport is on, then lay the page out hundreds of pixels too wide.
        // The columns overlap. Overview mode would zoom that mess to fit, so
        // it stays off and the page stays at initial-scale=1.
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);
    }
}
