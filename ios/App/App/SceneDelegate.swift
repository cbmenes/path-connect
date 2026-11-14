import UIKit
import WebKit
import Capacitor

/// Draws the game under the status bar, then marks the page so its top bar
/// clears the safe area. The website never loads this controller.
class PathConnectViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        let source = """
        !function(){try{if(location.protocol!=="capacitor:")return;var apply=function(){var m=document.querySelector('meta[name="viewport"]');if(m){var c=m.getAttribute("content")||"";if(c.indexOf("viewport-fit")<0)m.setAttribute("content",c?"viewport-fit=cover, "+c:"viewport-fit=cover");}if(document.documentElement)document.documentElement.setAttribute("data-native","ios");};apply();document.addEventListener("DOMContentLoaded",apply);}catch(e){}}();
        """
        let script = WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        webView?.configuration.userContentController.addUserScript(script)
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
