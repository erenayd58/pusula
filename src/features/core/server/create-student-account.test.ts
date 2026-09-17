import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { ActionError } = await import("@/lib/actions/create-action");
const { CREATE_STUDENT_ERRORS, createStudentAccount } = await import("./create-student-account");

const input = {
  fullName: "Yeni Öğrenci",
  username: "yeni.ogrenci",
  temporaryPassword: "gecici-sifre-1",
  season: "2026-2027",
  examDate: "2027-06-13",
};

function makeAdmin(opts: {
  existingUsername?: boolean;
  createUserError?: boolean;
  rpcError?: { code: string; message: string } | null;
}) {
  const deleteUser = vi.fn(async () => ({ data: {}, error: null }));
  const createUser = vi.fn(async () =>
    opts.createUserError
      ? { data: { user: null }, error: { message: "boom" } }
      : { data: { user: { id: "auth-1" } }, error: null },
  );
  const rpc = vi.fn(async () => ({ data: null, error: opts.rpcError ?? null }));
  const maybeSingle = vi.fn(async () => ({
    data: opts.existingUsername ? { id: "p1" } : null,
    error: null,
  }));
  const admin = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
    auth: { admin: { createUser, deleteUser } },
    rpc,
  };
  return { admin, createUser, deleteUser, rpc };
}

// Test mock'u AdminSupabaseClient'ın yalnızca kullanılan yüzeyini taklit eder.
type AdminArg = Parameters<typeof createStudentAccount>[0]["admin"];

describe("createStudentAccount", () => {
  it("kullanıcı adı doluysa Auth kullanıcısı hiç oluşturulmaz", async () => {
    const m = makeAdmin({ existingUsername: true });
    await expect(
      createStudentAccount({
        admin: m.admin as unknown as AdminArg,
        actorId: "coach-1",
        coachId: "coach-1",
        email: "yeni.ogrenci@ogrenci.pusula.local",
        input,
      }),
    ).rejects.toMatchObject({ message: CREATE_STUDENT_ERRORS.usernameTaken });
    expect(m.createUser).not.toHaveBeenCalled();
  });

  it("başarıda Auth kullanıcısı + RPC çağrılır, telafi yapılmaz", async () => {
    const m = makeAdmin({});
    const result = await createStudentAccount({
      admin: m.admin as unknown as AdminArg,
      actorId: "coach-1",
      coachId: "coach-1",
      email: "yeni.ogrenci@ogrenci.pusula.local",
      input,
    });
    expect(result).toEqual({ studentId: "auth-1" });
    expect(m.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "yeni.ogrenci@ogrenci.pusula.local", email_confirm: true }),
    );
    expect(m.rpc).toHaveBeenCalledWith(
      "create_student_account",
      expect.objectContaining({
        p_actor_id: "coach-1",
        p_auth_user_id: "auth-1",
        p_username: "yeni.ogrenci",
      }),
    );
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it("RPC yetki hatasında Auth kullanıcısı silinir (telafi) ve Türkçe hata döner", async () => {
    const m = makeAdmin({ rpcError: { code: "42501", message: "not_allowed" } });
    await expect(
      createStudentAccount({
        admin: m.admin as unknown as AdminArg,
        actorId: "coach-1",
        coachId: "coach-2",
        email: "yeni.ogrenci@ogrenci.pusula.local",
        input,
      }),
    ).rejects.toBeInstanceOf(ActionError);
    expect(m.deleteUser).toHaveBeenCalledWith("auth-1");
  });

  it("RPC beklenmeyen hatada da telafi yapılır ve hata yukarı fırlatılır", async () => {
    const m = makeAdmin({ rpcError: { code: "XX000", message: "db down" } });
    await expect(
      createStudentAccount({
        admin: m.admin as unknown as AdminArg,
        actorId: "coach-1",
        coachId: "coach-1",
        email: "yeni.ogrenci@ogrenci.pusula.local",
        input,
      }),
    ).rejects.toMatchObject({ code: "XX000" });
    expect(m.deleteUser).toHaveBeenCalledWith("auth-1");
  });

  it("Auth kullanıcısı oluşmazsa RPC çağrılmaz", async () => {
    const m = makeAdmin({ createUserError: true });
    await expect(
      createStudentAccount({
        admin: m.admin as unknown as AdminArg,
        actorId: "coach-1",
        coachId: "coach-1",
        email: "yeni.ogrenci@ogrenci.pusula.local",
        input,
      }),
    ).rejects.toMatchObject({ message: CREATE_STUDENT_ERRORS.authFailed });
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
