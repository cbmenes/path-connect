package com.cbmenes.pathconnect;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.plugin.WebView;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Capacitor remembers a live-reload folder in app prefs, and Android
        // backup can restore it after uninstall. That folder is not the web
        // client we just packaged, so the board kept the old scrambled assets.
        getSharedPreferences(WebView.WEBVIEW_PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(WebView.CAP_SERVER_PATH, "")
            .commit();
        super.onCreate(savedInstanceState);
        android.webkit.WebView webView = getBridge().getWebView();
        if (webView == null) return;
        WebSettings settings = webView.getSettings();
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);
        // The asset loader sometimes labels .css as a generic type. The
        // WebView then drops the stylesheet and the tiles have no grid.
        webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public WebResourceResponse shouldInterceptRequest(android.webkit.WebView view, WebResourceRequest request) {
                WebResourceResponse response = super.shouldInterceptRequest(view, request);
                if (response == null || request.getUrl() == null || request.getUrl().getPath() == null) return response;
                String path = request.getUrl().getPath();
                String mime = response.getMimeType();
                if (path.endsWith(".css") && !"text/css".equals(mime)) return retarget(response, "text/css");
                if ((path.endsWith(".js") || path.endsWith(".mjs")) && (mime == null || mime.contains("html") || mime.contains("octet"))) {
                    return retarget(response, "application/javascript");
                }
                return response;
            }

            private WebResourceResponse retarget(WebResourceResponse response, String mime) {
                String reason = response.getReasonPhrase();
                if (reason == null || reason.isEmpty()) reason = "OK";
                return new WebResourceResponse(
                    mime,
                    response.getEncoding(),
                    response.getStatusCode(),
                    reason,
                    response.getResponseHeaders(),
                    response.getData()
                );
            }
        });
        webView.post(() -> getBridge().getWebView().loadUrl(getBridge().getAppUrl()));
    }
}
