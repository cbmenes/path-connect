import { StrictMode, startTransition } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";
import { prepareAndroidClientBoard } from "@/lib/path-connect/android-client-board";

// Android discards the prerendered document and paints with createRoot.
// hydrateRoot never runs there, so a board mismatch cannot throw #418.
const android = prepareAndroidClientBoard(window);

startTransition(() => {
  if (android && document.body) {
    document.body.replaceChildren();
    createRoot(document.body).render(
      <StrictMode>
        <StartClient />
      </StrictMode>,
    );
    return;
  }
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
