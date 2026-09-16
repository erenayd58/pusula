import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getSessionUser = vi.fn();
vi.mock("@/lib/auth/get-session-user", () => ({ getSessionUser }));

const createClient = vi.fn(async () => ({ tag: "supabase" }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const { ACTION_ERRORS, ActionError, createAction, flattenFieldErrors } =
  await import("./create-action");
const { revalidatePath } = await import("next/cache");

const schema = z.object({ count: z.number().int().min(1, "En az 1 olmalı") });

function session(role: "owner" | "coach" | "student" | "parent" | null) {
  return {
    userId: "u1",
    email: null,
    userMetadata: {},
    profile: role ? { id: "u1", role } : null,
  };
}

describe("createAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("oturum yoksa genel hata döner, handler çalışmaz", async () => {
    getSessionUser.mockResolvedValue(null);
    const handler = vi.fn();
    const action = createAction({ name: "t", schema, roles: ["coach"], handler });
    expect(await action({ count: 1 })).toEqual({ ok: false, error: ACTION_ERRORS.unauthenticated });
    expect(handler).not.toHaveBeenCalled();
  });

  it("rol listede değilse ya da profil yoksa yetki hatası döner", async () => {
    const handler = vi.fn();
    const action = createAction({ name: "t", schema, roles: ["coach", "owner"], handler });

    getSessionUser.mockResolvedValue(session("student"));
    expect(await action({ count: 1 })).toEqual({ ok: false, error: ACTION_ERRORS.forbidden });

    getSessionUser.mockResolvedValue(session(null));
    expect(await action({ count: 1 })).toEqual({ ok: false, error: ACTION_ERRORS.forbidden });
    expect(handler).not.toHaveBeenCalled();
  });

  it("zod hatasında alan bazlı Türkçe mesajlar döner", async () => {
    getSessionUser.mockResolvedValue(session("coach"));
    const action = createAction({ name: "t", schema, roles: ["coach"], handler: vi.fn() });
    const result = await action({ count: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(ACTION_ERRORS.invalid);
      expect(result.fieldErrors).toEqual({ count: ["En az 1 olmalı"] });
    }
  });

  it("başarıda handler'ı bağlamla çağırır, revalidate eder ve veriyi döner", async () => {
    getSessionUser.mockResolvedValue(session("owner"));
    const handler = vi.fn(async (input: { count: number }, ctx: { userId: string }) => ({
      doubled: input.count * 2,
      by: ctx.userId,
    }));
    const action = createAction({
      name: "t",
      schema,
      roles: ["owner"],
      handler,
      revalidate: ["/coach/students"],
    });
    expect(await action({ count: 2 })).toEqual({ ok: true, data: { doubled: 4, by: "u1" } });
    expect(handler.mock.calls[0]?.[1]).toMatchObject({
      userId: "u1",
      supabase: { tag: "supabase" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/coach/students");
  });

  it("ActionError kullanıcıya mesajıyla döner; beklenmeyen hata genel mesaja çevrilir", async () => {
    getSessionUser.mockResolvedValue(session("coach"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const known = createAction({
      name: "t",
      schema,
      roles: ["coach"],
      handler: async () => {
        throw new ActionError("Bu kullanıcı adı kullanılıyor.", { username: ["Kullanılıyor"] });
      },
    });
    expect(await known({ count: 1 })).toEqual({
      ok: false,
      error: "Bu kullanıcı adı kullanılıyor.",
      fieldErrors: { username: ["Kullanılıyor"] },
    });

    const unknown = createAction({
      name: "patlayan",
      schema,
      roles: ["coach"],
      handler: async () => {
        throw new Error("gizli ayrıntı");
      },
    });
    expect(await unknown({ count: 1 })).toEqual({ ok: false, error: ACTION_ERRORS.unexpected });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("Next.js redirect hatasını yutmaz, yeniden fırlatır", async () => {
    getSessionUser.mockResolvedValue(session("coach"));
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/student;307;",
    });
    const action = createAction({
      name: "t",
      schema,
      roles: ["coach"],
      handler: async () => {
        throw redirectError;
      },
    });
    await expect(action({ count: 1 })).rejects.toBe(redirectError);
  });
});

describe("flattenFieldErrors", () => {
  it("iç içe yolları nokta ile birleştirir, yolsuz hatayı _form altına koyar", () => {
    const nested = z.object({ a: z.object({ b: z.string().min(2, "kısa") }) });
    const r1 = nested.safeParse({ a: { b: "x" } });
    if (r1.success) throw new Error("beklenmedik");
    expect(flattenFieldErrors(r1.error)).toEqual({ "a.b": ["kısa"] });

    const refined = z.object({ x: z.number() }).refine(() => false, "form geneli");
    const r2 = refined.safeParse({ x: 1 });
    if (r2.success) throw new Error("beklenmedik");
    expect(flattenFieldErrors(r2.error)).toEqual({ _form: ["form geneli"] });
  });
});
