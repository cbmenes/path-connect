import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { applyNativeIosSafeArea, nativeIosSafeAreaScript } from "./native-shell.ts";

function fakeDocument(viewport: string | null) {
  const attrs = new Map<string, string>();
  const meta =
    viewport === null
      ? null
      : {
          content: viewport,
          getAttribute: () => meta!.content,
          setAttribute: (_name: string, value: string) => {
            meta!.content = value;
          },
        };
  return {
    meta,
    doc: {
      querySelector: () => meta,
      documentElement: {
        setAttribute: (name: string, value: string) => attrs.set(name, value),
      },
    } as unknown as Document,
    native: () => attrs.get("data-native"),
  };
}

test("the website and the PWA are left alone", () => {
  for (const protocol of ["https:", "http:"]) {
    const page = fakeDocument("width=device-width, initial-scale=1");
    assert.equal(applyNativeIosSafeArea(page.doc, protocol), false);
    assert.equal(page.meta?.content, "width=device-width, initial-scale=1");
    assert.equal(page.native(), undefined);
  }
});

test("the iOS shell opts into the safe area and marks the document", () => {
  const page = fakeDocument("width=device-width, initial-scale=1");
  assert.equal(applyNativeIosSafeArea(page.doc, "capacitor:"), true);
  assert.equal(page.meta?.content, "viewport-fit=cover, width=device-width, initial-scale=1");
  assert.equal(page.native(), "ios");
  applyNativeIosSafeArea(page.doc, "capacitor:");
  assert.equal(page.meta?.content, "viewport-fit=cover, width=device-width, initial-scale=1");
});

test("the head script matches that rule", () => {
  const run = (protocol: string) => {
    const page = fakeDocument("width=device-width, initial-scale=1");
    vm.runInNewContext(nativeIosSafeAreaScript, {
      location: { protocol },
      document: page.doc,
    });
    return page;
  };
  const ios = run("capacitor:");
  assert.equal(ios.meta?.content, "viewport-fit=cover, width=device-width, initial-scale=1");
  assert.equal(ios.native(), "ios");
  const web = run("https:");
  assert.equal(web.meta?.content, "width=device-width, initial-scale=1");
  assert.equal(web.native(), undefined);
});
