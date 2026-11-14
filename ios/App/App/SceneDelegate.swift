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

    /// Seconds the launch artwork stays up before it fades, matching
    /// SplashScreen.launchShowDuration in capacitor.config.ts.
    static let splashHold: TimeInterval = 1.2
    private var splashView: UIImageView?

    /// The same Splash artwork the launch screen and the SplashScreen plugin use,
    /// added here as well so it shows even when the simulator reuses a cached
    /// launch screen or the plugin has not been synced into the build yet.
    override func viewDidLoad() {
        super.viewDidLoad()
        guard let image = UIImage(named: "Splash") else { return }
        let splash = UIImageView(image: image)
        splash.contentMode = .scaleAspectFill
        splash.clipsToBounds = true
        splash.backgroundColor = UIColor(red: 0.847, green: 0.933, blue: 0.890, alpha: 1)
        splash.frame = view.bounds
        splash.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(splash)
        splashView = splash
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard let splash = splashView else { return }
        splashView = nil
        view.bringSubviewToFront(splash)
        UIView.animate(withDuration: 0.3, delay: Self.splashHold, options: [.curveEaseOut]) {
            splash.alpha = 0
        } completion: { _ in
            splash.removeFromSuperview()
        }
    }

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
