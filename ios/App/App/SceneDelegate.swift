import UIKit
import WebKit
import Capacitor

/// Capacitor makes the web view the whole screen, so the page starts under the
/// status bar and Dynamic Island. This passes the real top safe-area inset to
/// the page as `--pc-native-top`, and keeps it set if React rewrites <html>.
/// The website never loads this controller.
class PathConnectViewController: CAPBridgeViewController {
    static let safeAreaScript = """
    !function(){var t="__TOP__";window.__pcNativeTop=t;var a=function(){var d=document.documentElement;if(!d)return;if(d.style.getPropertyValue("--pc-native-top")!==t)d.style.setProperty("--pc-native-top",t);if(d.getAttribute("data-native")!=="ios")d.setAttribute("data-native","ios");};var w=function(){var d=document.documentElement;if(!d||d.__pcSafeArea)return;d.__pcSafeArea=1;new MutationObserver(function(){a();}).observe(d,{attributes:true,attributeFilter:["style","data-native"]});};a();w();document.addEventListener("DOMContentLoaded",function(){a();w();});window.addEventListener("load",a);}();
    """

    private var appliedTop: CGFloat = -1

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        applySafeAreaTop()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        applySafeAreaTop()
    }

    private func applySafeAreaTop() {
        guard let webView = webView else { return }
        let top = max(view.safeAreaInsets.top, view.window?.safeAreaInsets.top ?? 0)
        guard top > 0, top != appliedTop else { return }
        appliedTop = top
        let source = Self.safeAreaScript.replacingOccurrences(of: "__TOP__", with: "\(Int(top.rounded(.up)))px")
        // Covers every later page load; the newest script runs last, so its value wins.
        webView.configuration.userContentController.addUserScript(
            WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )
        webView.evaluateJavaScript(source, completionHandler: nil)
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = PathConnectViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
