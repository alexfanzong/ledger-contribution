"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  if (error) redirect(`/auth?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const headerStore = await headers();
  const email = requiredString(formData, "email");
  const password = requiredString(formData, "password");
  const displayName = optionalString(formData, "display_name");
  const origin = headerStore.get("origin") ?? "http://127.0.0.1:3001";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName ?? email.split("@")[0] },
      emailRedirectTo: `${origin}/auth/callback`
    }
  });

  if (error) redirect(`/auth?error=${encodeURIComponent(error.message)}`);
  redirect("/auth?message=Check your email to confirm the account, then sign in.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
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
