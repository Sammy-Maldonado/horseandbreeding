import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import AppMessage from "./AppMessage.vue";

/**
 * HOR-99 — the status/error sink.
 *
 * `AppMessage` is the single component every status and error message in the
 * premium wizard and the payment form flows into: the server's `statusMessage`
 * reaches it through `RegisterUser.vue` and `StripePeyment.vue`. It used to
 * render that string with `v-html`, so any markup a message carried was parsed
 * as HTML. Because `server/api/user.put.ts` builds those messages by
 * interpolating the caller's own email, an attacker-controlled string reached a
 * live HTML sink — an XSS path.
 *
 * The message contract is plain text. This component must therefore render it
 * as text: hostile markup is shown literally, never parsed. These tests mount
 * the real component and assert no element is ever created from the message,
 * whatever it contains. They touch no database.
 */

describe("AppMessage", () => {
  it("renders an injected <img> as text, never as an element", async () => {
    const hostile = '<img src=x onerror="globalThis.__hor99_xss = true">';

    const wrapper = await mountSuspended(AppMessage, {
      props: { message: hostile, isError: true },
    });

    // The sink must not have parsed the string into a real <img> node.
    expect(wrapper.find("img").exists()).toBe(false);
    // The onerror payload must not have run.
    expect((globalThis as Record<string, unknown>).__hor99_xss).toBeUndefined();
    // The markup is shown to the user verbatim.
    expect(wrapper.text()).toContain(hostile);
  });

  it("renders an injected <script> as text, never as an element", async () => {
    const hostile = "<script>globalThis.__hor99_script = true</script>";

    const wrapper = await mountSuspended(AppMessage, {
      props: { message: hostile, isError: true },
    });

    expect(wrapper.find("script").exists()).toBe(false);
    expect(
      (globalThis as Record<string, unknown>).__hor99_script
    ).toBeUndefined();
    expect(wrapper.text()).toContain(hostile);
  });

  it("shows literal <b> tags rather than parsing them as bold", async () => {
    const wrapper = await mountSuspended(AppMessage, {
      props: { message: "Invalid email <b>a@b.c</b> format.", isError: true },
    });

    // Presentation markup in the message is now data, not formatting.
    expect(wrapper.find("b").exists()).toBe(false);
    expect(wrapper.text()).toContain("<b>a@b.c</b>");
  });
});
