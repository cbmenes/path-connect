import { registerPlugin } from "@capacitor/core";

export type RemoveAdsPurchaseStatus = "purchased" | "cancelled" | "pending" | "unavailable";

export interface RemoveAdsPlugin {
  purchase(options: { productId: string }): Promise<{ status: RemoveAdsPurchaseStatus }>;
  owned(options: { productId: string }): Promise<{ owned: boolean }>;
}

export const RemoveAds = registerPlugin<RemoveAdsPlugin>("RemoveAds");
