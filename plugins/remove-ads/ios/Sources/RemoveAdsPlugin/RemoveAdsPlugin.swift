import Capacitor
import StoreKit

/// StoreKit 2 purchase for the non-consumable App Store product `remove_ads`.
@objc(RemoveAdsPlugin)
public class RemoveAdsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RemoveAdsPlugin"
    public let jsName = "RemoveAds"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "owned", returnType: CAPPluginReturnPromise)
    ]

    @objc func purchase(_ call: CAPPluginCall) {
        let productId = call.getString("productId") ?? "remove_ads"
        Task { @MainActor in
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.resolve(["status": "unavailable"])
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    let transaction = try Self.verified(verification)
                    guard transaction.productID == productId else {
                        call.resolve(["status": "unavailable"])
                        return
                    }
                    await transaction.finish()
                    call.resolve(["status": "purchased"])
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                case .pending:
                    call.resolve(["status": "pending"])
                @unknown default:
                    call.resolve(["status": "unavailable"])
                }
            } catch {
                call.resolve(["status": "unavailable"])
            }
        }
    }

    /// True when the App Store still entitles this Apple ID to the non-consumable.
    @objc func owned(_ call: CAPPluginCall) {
        let productId = call.getString("productId") ?? "remove_ads"
        Task { @MainActor in
            var owns = false
            for await result in Transaction.currentEntitlements {
                guard let transaction = try? Self.verified(result) else { continue }
                guard transaction.productID == productId, transaction.revocationDate == nil else { continue }
                owns = true
                await transaction.finish()
            }
            call.resolve(["owned": owns])
        }
    }

    private static func verified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw RemoveAdsStoreError.unverified
        case .verified(let safe):
            return safe
        }
    }
}

private enum RemoveAdsStoreError: Error {
    case unverified
}
