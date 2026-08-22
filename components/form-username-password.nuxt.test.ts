import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import FormUsernamePassword from "./form-username-password.vue";

/**
 * HOR-98 — the premium wizard's credential step.
 *
 * Two guarantees live here. First, the fields start EMPTY: the component used
 * to ship a hardcoded email and password as reactive defaults, which placed a
 * working-looking credential pair in the public client bundle. Second, the
 * step now carries the account choice ("I already have an account" / "I'm new
 * here") that replaced the deleted `user-by-email-pass` pre-check, and emits
 * it alongside the credentials so the wizard knows whether to sign the user
 * in or simply advance.
 */

describe("form-username-password", () => {
  it("starts with empty credential fields", async () => {
    const wrapper = await mountSuspended(FormUsernamePassword);

    const email = wrapper.find("#email").element as HTMLInputElement;
    const password = wrapper.find("#password").element as HTMLInputElement;

    expect(email.value).toBe("");
    expect(password.value).toBe("");
  });

  it("masks the password input", async () => {
    const wrapper = await mountSuspended(FormUsernamePassword);

    expect(wrapper.find("#password").attributes("type")).toBe("password");
  });

  it("offers the two account choices, defaulting to an existing account", async () => {
    const wrapper = await mountSuspended(FormUsernamePassword);

    const existing = wrapper.find("#mode-existing").element as HTMLInputElement;
    const fresh = wrapper.find("#mode-new").element as HTMLInputElement;

    expect(existing.checked).toBe(true);
    expect(fresh.checked).toBe(false);
    expect(wrapper.text()).toContain("I already have an account");
    expect(wrapper.text()).toContain("I'm new here");
  });

  it("emits the credentials with the default existing-account mode", async () => {
    const wrapper = await mountSuspended(FormUsernamePassword);

    await wrapper.find("#email").setValue("mare.owner@example.test");
    await wrapper.find("#password").setValue("CorrectHorse1");
    await wrapper.find("form").trigger("submit");

    const emitted = wrapper.emitted("getUserNamePassword");
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toMatchObject({
      email: "mare.owner@example.test",
      password: "CorrectHorse1",
      mode: "existing"
    });
  });

  it("emits mode new when the visitor says they have no account", async () => {
    const wrapper = await mountSuspended(FormUsernamePassword);

    await wrapper.find("#mode-new").setValue();
    await wrapper.find("#email").setValue("new.visitor@example.test");
    await wrapper.find("#password").setValue("CorrectHorse1");
    await wrapper.find("form").trigger("submit");

    const emitted = wrapper.emitted("getUserNamePassword");
    expect(emitted?.[0]?.[0]).toMatchObject({ mode: "new" });
  });
});
