"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  buildAuthErrorPath,
  buildAuthMessagePath,
  buildPasswordRecoveryRedirect,
  PASSWORD_RECOVERY_COOKIE,
  resolveAuthOrigin,
  validatePasswordUpdate
} from "@/lib/auth-page";
import { createClient } from "@/lib/supabase/server";
import { parseContributionPackText } from "@/lib/imports/validate";
import { prepareContributionClaimImport } from "@/lib/imports/prepare";
import type { ContributionStatus, Impact } from "@/lib/types";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = requiredString(formData, "email");
  const password = requiredString(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(buildAuthErrorPath("signin", error.message));
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const headerStore = await headers();
  const email = requiredString(formData, "email");
  const password = requiredString(formData, "password");
  const displayName = optionalString(formData, "display_name");
  let origin: string;
  try {
    origin = resolveAuthOrigin({
      configuredUrl: process.env.NEXT_PUBLIC_SITE_URL,
      requestOrigin: headerStore.get("origin"),
      requestHost: headerStore.get("x-forwarded-host") ?? headerStore.get("host")
    });
  } catch {
    redirect(buildAuthErrorPath("signup", "Unable to create a secure confirmation link."));
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName ?? email.split("@")[0] },
      emailRedirectTo: `${origin}/auth/callback`
    }
  });

  if (error) redirect(buildAuthErrorPath("signup", error.message));
  redirect("/auth?message=Check your email to confirm the account, then sign in.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const headerStore = await headers();
  const email = requiredString(formData, "email");

  let redirectTo: string;
  try {
    const origin = resolveAuthOrigin({
      configuredUrl: process.env.NEXT_PUBLIC_SITE_URL,
      requestOrigin: headerStore.get("origin"),
      requestHost: headerStore.get("x-forwarded-host") ?? headerStore.get("host")
    });
    redirectTo = buildPasswordRecoveryRedirect(origin);
  } catch {
    redirect(buildAuthErrorPath("forgot", "Unable to create a secure recovery link."));
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    redirect(
      buildAuthErrorPath("forgot", "Unable to send a reset email right now. Please try again.")
    );
  }

  redirect(
    buildAuthMessagePath(
      "forgot",
      "If an account exists for that email, a password reset link has been sent."
    )
  );
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");
  const validationError = validatePasswordUpdate(password, confirmation);

  if (validationError) redirect(buildAuthErrorPath("reset", validationError));

  if (cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value !== "verified") {
    redirect(
      buildAuthErrorPath(
        "forgot",
        "Open the password reset link from your email before choosing a new password."
      )
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    cookieStore.delete(PASSWORD_RECOVERY_COOKIE);
    redirect(
      buildAuthErrorPath(
        "forgot",
        "This password reset link is invalid or expired. Request a new link."
      )
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(buildAuthErrorPath("reset", error.message));

  cookieStore.delete(PASSWORD_RECOVERY_COOKIE);
  await supabase.auth.signOut();
  redirect(buildAuthMessagePath("signin", "Password updated. Sign in with your new password."));
}

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/auth");

  const name = requiredString(formData, "name");
  const description = optionalString(formData, "description");

  const { data: projectId, error: projectError } = await supabase.rpc("create_project_with_owner", {
    p_name: name,
    p_description: description
  });

  if (projectError) redirect(`/projects/new?error=${encodeURIComponent(projectError.message)}`);
  redirect(`/projects/${projectId}`);
}

export async function createSampleProject() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_sample_project");
  if (error) throw new Error(error.message);
  redirect(`/projects/${data}`);
}

export async function createInvitation(formData: FormData) {
  const supabase = await createClient();
  const projectId = requiredString(formData, "project_id");
  const email = requiredString(formData, "email").toLowerCase();
  const role = requiredString(formData, "role");
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

  const { error } = await supabase.from("project_invitations").insert({
    project_id: projectId,
    email,
    role,
    token,
    expires_at: expiresAt
  });

  if (error) redirect(`/projects/${projectId}/members?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}/members`);
}

export async function createAgent(formData: FormData) {
  const supabase = await createClient();
  const projectId = requiredString(formData, "project_id");
  const ownerMemberId = requiredString(formData, "owner_member_id");
  const name = requiredString(formData, "name");
  const agentType = optionalString(formData, "agent_type");

  const { error } = await supabase.from("agent_registry").insert({
    project_id: projectId,
    owner_member_id: ownerMemberId,
    name,
    agent_type: agentType
  });

  if (error) redirect(`/projects/${projectId}/members?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}/members`);
  revalidatePath(`/projects/${projectId}/ledger`);
}

export async function acceptInvitation(formData: FormData) {
  const supabase = await createClient();
  const token = requiredString(formData, "token");
  const { data, error } = await supabase.rpc("accept_project_invitation", { p_token: token });
  if (error) throw new Error(error.message);
  redirect(`/projects/${data}`);
}

export async function createMilestone(formData: FormData) {
  const supabase = await createClient();
  const projectId = requiredString(formData, "project_id");
  const title = requiredString(formData, "title");
  const description = optionalString(formData, "description");
  const targetDate = optionalString(formData, "target_date");

  const { error } = await supabase.from("milestones").insert({
    project_id: projectId,
    title,
    description,
    target_date: targetDate
  });

  if (error) redirect(`/projects/${projectId}/milestones?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones`);
}

export async function createContribution(formData: FormData) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/auth");

  const projectId = requiredString(formData, "project_id");
  const contributorSource = requiredString(formData, "contributor_source");
  const milestoneId = optionalString(formData, "milestone_id");
  const category = requiredString(formData, "category");
  const description = requiredString(formData, "description");
  const evidenceUrl = optionalString(formData, "evidence_url");
  const proposedImpact = requiredString(formData, "proposed_impact") as Impact;
  const supersedesId = optionalString(formData, "supersedes_id");

  const { data: currentMember, error: memberError } = await supabase
    .from("project_members")
    .select("id, display_name")
    .eq("project_id", projectId)
    .eq("profile_id", userData.user.id)
    .eq("is_demo", false)
    .single();

  if (memberError || !currentMember) {
    redirect(`/projects/${projectId}/ledger?error=${encodeURIComponent("Current user is not a project member")}`);
  }

  const contributionPayload: Record<string, string | null> = {
    project_id: projectId,
    milestone_id: milestoneId,
    category,
    description,
    evidence_url: evidenceUrl,
    proposed_impact: proposedImpact,
    supersedes_id: supersedesId
  };

  if (contributorSource === `member:${currentMember.id}`) {
    contributionPayload.contributor_type = "human";
    contributionPayload.contributor_member_id = currentMember.id;
    contributionPayload.contributor_agent_id = null;
    contributionPayload.contributor_label = currentMember.display_name;
  } else if (contributorSource.startsWith("agent:")) {
    const agentId = contributorSource.slice("agent:".length);
    const { data: agent, error: agentError } = await supabase
      .from("agent_registry")
      .select("id, name")
      .eq("id", agentId)
      .eq("project_id", projectId)
      .eq("owner_member_id", currentMember.id)
      .single();

    if (agentError || !agent) {
      redirect(`/projects/${projectId}/ledger?error=${encodeURIComponent("Agent is not registered to the current member")}`);
    }

    contributionPayload.contributor_type = "agent";
    contributionPayload.contributor_member_id = null;
    contributionPayload.contributor_agent_id = agent.id;
    contributionPayload.contributor_label = agent.name;
  } else {
    redirect(`/projects/${projectId}/ledger?error=${encodeURIComponent("Invalid contributor source")}`);
  }

  const { error } = await supabase.from("contributions").insert(contributionPayload as never);

  if (error) redirect(`/projects/${projectId}/ledger?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}/ledger`);
  revalidatePath(`/projects/${projectId}/review`);
}

export async function reviewContribution(formData: FormData) {
  const supabase = await createClient();
  const projectId = requiredString(formData, "project_id");
  const contributionId = requiredString(formData, "contribution_id");
  const status = requiredString(formData, "status") as ContributionStatus;
  const finalImpact = optionalString(formData, "final_impact") as Impact | null;
  const reviewNote = optionalString(formData, "review_note");

  const { error } = await supabase.rpc("review_contribution", {
    p_contribution_id: contributionId,
    p_status: status,
    p_final_impact: finalImpact,
    p_review_note: reviewNote
  });

  if (error) redirect(`/projects/${projectId}/review?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}/ledger`);
  revalidatePath(`/projects/${projectId}/review`);
  revalidatePath(`/projects/${projectId}/simulation`);
}

export async function importContributionPackClaim(formData: FormData) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/auth");

  const projectId = requiredString(formData, "project_id");
  const packText = requiredString(formData, "pack_json");
  const claimId = requiredString(formData, "claim_id");
  const category = requiredString(formData, "category");
  const description = requiredString(formData, "description");
  const proposedImpact = requiredString(formData, "proposed_impact");
  const milestoneId = optionalString(formData, "milestone_id");
  const returnPath = `/projects/${projectId}/import`;

  const parsedPack = parseContributionPackText(packText);
  if (!parsedPack.success) {
    redirect(`${returnPath}?error=${encodeURIComponent("Contribution Pack is invalid or too large.")}`);
  }

  const [{ data: project }, { data: currentMember }, { data: ownedAgents }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", projectId).single(),
    supabase
      .from("project_members")
      .select("id, display_name")
      .eq("project_id", projectId)
      .eq("profile_id", userData.user.id)
      .eq("is_demo", false)
      .single(),
    supabase
      .from("agent_registry")
      .select("id, name, owner_member_id")
      .eq("project_id", projectId)
  ]);

  if (!project || !currentMember) {
    redirect(`${returnPath}?error=${encodeURIComponent("Current user is not a project member.")}`);
  }

  const prepared = prepareContributionClaimImport({
    pack: parsedPack.data,
    actor: {
      project,
      member: currentMember,
      owned_agents: (ownedAgents ?? [])
        .filter((agent) => agent.owner_member_id === currentMember.id)
        .map((agent) => ({ id: agent.id, name: agent.name })),
    },
    claimId,
    edits: {
      category,
      description,
      proposedImpact,
      milestoneId,
    },
  });

  if (!prepared.success) {
    redirect(`${returnPath}?error=${encodeURIComponent("This claim cannot be imported for the current member.")}`);
  }

  const { error } = await supabase.rpc("import_contribution_pack_claim", {
    p_project_id: prepared.data.project_id,
    p_pack: prepared.data.pack,
    p_claim_id: prepared.data.claim_id,
    p_category: prepared.data.category,
    p_description: prepared.data.description,
    p_proposed_impact: prepared.data.proposed_impact,
    p_milestone_id: prepared.data.milestone_id,
    p_contributor_agent_id: prepared.data.contributor_agent_id,
  } as never);

  if (error) {
    const safeMessage = error.message.includes("IDENTITY_CONFLICT")
      ? "This pack claim was already imported with different content. Create a new pack id or claim id."
      : "Import failed. No contribution was created.";
    redirect(`${returnPath}?error=${encodeURIComponent(safeMessage)}`);
  }

  revalidatePath(`/projects/${projectId}/import`);
  revalidatePath(`/projects/${projectId}/ledger`);
  revalidatePath(`/projects/${projectId}/review`);
  redirect(
    `${returnPath}?message=${encodeURIComponent("Claim submitted. Demo PM Agent pre-verification is ready; peer confirmation is still required.")}`
  );
}
