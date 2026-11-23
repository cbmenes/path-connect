import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";
import { prepareAndroidClientBoard } from "@/lib/path-connect/android-client-board";

// Before hydrateRoot, so the Android WebView's first render matches an empty board.
prepareAndroidClientBoard(window);

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
