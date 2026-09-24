"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/web/session";
import { errorState, type ActionState } from "@/lib/web/actionState";
import { str } from "@/lib/web/form";
import { createUser, setUserActive, setUserRole } from "@/lib/team/service";

export async function createUserAction(_: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    const u = await createUser(actor, { email: str(form, "email"), name: str(form, "name"), role: str(form, "role"), password: str(form, "password") });
    revalidatePath("/os/team");
    return { ok: `Created an account for ${u.email}. Share the password with them over a separate channel.` };
  } catch (err) {
    return errorState(err);
  }
}

export async function setActiveAction(_: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await setUserActive(actor, str(form, "userId"), str(form, "active") === "true");
    revalidatePath("/os/team");
    return { ok: "Updated." };
  } catch (err) {
    return errorState(err);
  }
}

export async function setRoleAction(_: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await setUserRole(actor, str(form, "userId"), str(form, "role"));
    revalidatePath("/os/team");
    return { ok: "Role changed. It applies from their next sign-in." };
  } catch (err) {
    return errorState(err);
  }
}
