package com.cbmenes.pathconnect;

import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.widget.ImageView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.plugin.WebView;

public class MainActivity extends BridgeActivity {
    private static final String SPLASH_ARTWORK = "pc-splash-art";
    private boolean splashCoverInstalled;

    /**
     * Chrome on the phone honors the page viewport and lets the grid size the
     * tiles. This WebView instead keeps a button's content size, so the pipes
     * paint over the cells beside them. The script below runs only in this
     * WebView, on the packaged page.
     */
    private static final String BOARD_LAYOUT_SCRIPT = """
        (function (win) {
          if (win.__pcWvBoard) return;
          var doc = win.document;
          if (!doc || !doc.documentElement) return;
          var base = [
            "html{-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important}",
            ".pc-shell,.pc-stage,.pc-board-wrap,.pc-tray,.pc-board,.pc-tile{min-width:0!important;max-width:100%!important}",
            ".pc-board{display:grid!important;width:100%!important;grid-template-columns:repeat(var(--pc-cols,5),minmax(0,1fr))!important}",
            ".pc-board>.pc-tile{-webkit-appearance:none!important;appearance:none!important;display:block!important;box-sizing:border-box!important;width:100%!important;min-width:0!important;min-height:0!important;max-width:100%!important;height:auto!important;aspect-ratio:1!important;padding:0!important;margin:0!important}",
            ".pc-tile .pc-depth,.pc-tile .pc-spin{position:absolute!important;top:0!important;right:0!important;bottom:0!important;left:0!important;width:auto!important;height:auto!important}",
            ".pc-tile svg{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important}"
          ].join("");
          function styleNode() {
            var node = doc.getElementById("pc-wv-board");
            if (!node) {
              node = doc.createElement("style");
              node.id = "pc-wv-board";
              (doc.head || doc.documentElement).appendChild(node);
            }
            return node;
          }
          function colsOf(board) {
            var raw = board.getAttribute("style") || "";
            var at = raw.indexOf("--pc-cols");
            var digits = "";
            if (at >= 0) {
              for (var i = at; i < raw.length; i++) {
                var c = raw.charAt(i);
                if (c >= "0" && c <= "9") digits += c;
                else if (digits) break;
              }
            }
            var n = parseInt(digits, 10);
            return n > 0 ? n : 5;
          }
          function viewWidth() {
            var inner = win.innerWidth || 0;
            var root = doc.documentElement ? doc.documentElement.clientWidth : 0;
            if (inner > 40 && root > 40) return inner < root ? inner : root;
            return inner > 40 ? inner : root;
          }
          function intended(shell) {
            if (!shell) return 0;
            var raw = win.getComputedStyle(shell).getPropertyValue("--pc-board");
            if (!raw) return 0;
            var host = doc.body || doc.documentElement;
            if (!host) return 0;
            var probe = doc.createElement("div");
            probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;height:0;min-width:0;width:" + raw.trim() + ";";
            host.appendChild(probe);
            var width = probe.getBoundingClientRect().width || 0;
            if (probe.remove) probe.remove();
            return width;
          }
          function padX(node) {
            if (!node) return 0;
            var style = win.getComputedStyle(node);
            return (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
          }
          function lock() {
            var node = styleNode();
            var rules = [base];
            var view = viewWidth();
            var boards = doc.querySelectorAll(".pc-board");
            for (var i = 0; i < boards.length; i++) {
              var board = boards[i];
              var tiles = board.querySelectorAll(".pc-tile");
              var count = 0;
              for (var t = 0; t < tiles.length; t++) {
                if (tiles[t].parentElement === board) count++;
              }
              if (!count) continue;
              var cols = colsOf(board);
              var rows = Math.ceil(count / cols);
              var shell = board.closest ? board.closest(".pc-shell") : null;
              var wrap = board.closest ? board.closest(".pc-board-wrap") : null;
              var tray = board.parentElement;
              var width = intended(shell) - padX(wrap) - padX(tray);
              if (!(width > 40)) width = board.clientWidth || 0;
              if (view > 40 && width > view - 16) width = view - 16;
              var gapStyle = win.getComputedStyle(board);
              var gap = parseFloat(gapStyle.columnGap);
              if (!isFinite(gap)) gap = parseFloat(gapStyle.gap);
              if (!isFinite(gap) || gap < 0) gap = 0;
              var size = (width - gap * (cols - 1)) / cols;
              if (!(size > 8)) continue;
              size = Math.round(size * 100) / 100;
              width = Math.round(width * 100) / 100;
              var key = "b" + i;
              board.setAttribute("data-pc-wv", key);
              var px = size + "px";
              rules.push(
                '.pc-board[data-pc-wv="' + key + '"]{width:' + width + 'px!important;min-width:0!important;max-width:' + width + 'px!important;grid-template-columns:repeat(' + cols + ',' + px + ')!important;grid-template-rows:repeat(' + rows + ',' + px + ')!important}' +
                '.pc-board[data-pc-wv="' + key + '"]>.pc-tile{width:' + px + '!important;height:' + px + '!important;min-width:' + px + '!important;min-height:' + px + '!important;max-width:' + px + '!important;max-height:' + px + '!important;aspect-ratio:auto!important}'
              );
            }
            var next = rules.join("");
            if (node.textContent !== next) node.textContent = next;
          }
          function safe() {
            try { lock(); } catch (error) {}
          }
          win.__pcWvLock = safe;
          safe();
          win.addEventListener("resize", safe);
          win.setInterval(safe, 300);
          win.__pcWvBoard = true;
        })(window);
        """;

    private static void matchChromeViewport(android.webkit.WebView webView, boolean initialScale) {
        WebSettings settings = webView.getSettings();
        // Honor width=device-width, and stay at the same 100% scale Chrome uses.
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);
        settings.setTextZoom(100);
        settings.setMinimumFontSize(1);
        settings.setMinimumLogicalFontSize(1);
        settings.setDefaultFontSize(16);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        if (initialScale) webView.setInitialScale(100);
    }

    private static void installBoardLayout(android.webkit.WebView webView) {
        if (webView == null) return;
        webView.evaluateJavascript(BOARD_LAYOUT_SCRIPT, null);
    }

    /**
     * Android 12 keeps a centered icon on screen for the whole launch splash.
     * Cover that view with the full splash artwork until the splash goes away.
     */
    private void coverSystemSplashWithArtwork() {
        if (splashCoverInstalled) return;
        splashCoverInstalled = true;
        final View decor = getWindow().getDecorView();
        getWindow().setBackgroundDrawableResource(R.drawable.splash_window);
        final long started = android.os.SystemClock.uptimeMillis();
        decor.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            private long lastApply;

            @Override
            public boolean onPreDraw() {
                long now = android.os.SystemClock.uptimeMillis();
                boolean showing = true;
                if (now - lastApply >= 16) {
                    lastApply = now;
                    showing = applySplashArtwork(decor);
                }
                long elapsed = now - started;
                if (elapsed > 1600 || (!showing && elapsed > 400)) {
                    ViewTreeObserver observer = decor.getViewTreeObserver();
                    if (observer.isAlive()) observer.removeOnPreDrawListener(this);
                }
                return true;
            }
        });
    }

    private boolean applySplashArtwork(View root) {
        View splash = findSplashView(root);
        if (!(splash instanceof ViewGroup group) || containsWebView(group)) return false;
        group.setClipToOutline(false);
        group.setClipChildren(false);
        group.setBackgroundResource(R.drawable.splash_window);
        ImageView artwork = group.findViewWithTag(SPLASH_ARTWORK);
        if (artwork == null) {
            artwork = new ImageView(this);
            artwork.setTag(SPLASH_ARTWORK);
            artwork.setScaleType(ImageView.ScaleType.FIT_CENTER);
            artwork.setImageResource(R.drawable.splash);
            artwork.setBackgroundResource(R.color.splash_background);
            artwork.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
            group.addView(artwork, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            ));
        }
        artwork.bringToFront();
        for (int i = 0; i < group.getChildCount(); i++) {
            View child = group.getChildAt(i);
            if (child != artwork) child.setVisibility(View.GONE);
        }
        return true;
    }

    private static boolean containsWebView(View view) {
        if (view instanceof android.webkit.WebView) return true;
        if (!(view instanceof ViewGroup group)) return false;
        for (int i = 0; i < group.getChildCount(); i++) {
            if (containsWebView(group.getChildAt(i))) return true;
        }
        return false;
    }

    private View findSplashView(View view) {
        if (view == null) return null;
        if (view.getClass().getName().endsWith("SplashScreenView")) return view;
        if (!(view instanceof ViewGroup group)) return null;
        for (int i = 0; i < group.getChildCount(); i++) {
            View child = group.getChildAt(i);
            if (isSplashIcon(child) && child.getParent() instanceof View parent) return parent;
            View found = findSplashView(child);
            if (found != null) return found;
        }
        return null;
    }

    private boolean isSplashIcon(View view) {
        int id = view.getId();
        if (id == View.NO_ID) return false;
        try {
            return "splashscreen_icon_view".equals(getResources().getResourceEntryName(id));
        } catch (android.content.res.Resources.NotFoundException ignored) {
            return false;
        }
    }

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
        coverSystemSplashWithArtwork();
        android.webkit.WebView webView = getBridge().getWebView();
        if (webView == null) return;
        matchChromeViewport(webView, true);
        // The asset loader sometimes labels .css as a generic type. The
        // WebView then drops the stylesheet and the tiles have no grid.
        webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public void onPageStarted(android.webkit.WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                matchChromeViewport(view, false);
            }

            @Override
            public void onPageCommitVisible(android.webkit.WebView view, String url) {
                super.onPageCommitVisible(view, url);
                installBoardLayout(view);
            }

            @Override
            public void onPageFinished(android.webkit.WebView view, String url) {
                super.onPageFinished(view, url);
                installBoardLayout(view);
            }

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
        webView.post(() -> {
            android.webkit.WebView current = getBridge().getWebView();
            if (current == null) return;
            matchChromeViewport(current, true);
            current.loadUrl(getBridge().getAppUrl());
        });
    }
}
