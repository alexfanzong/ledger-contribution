export type ContributionStatus = "pending_review" | "confirmed" | "partial" | "rejected";
export type Impact = "low" | "medium" | "high";
export type ContributorType = "human" | "agent" | "contractor" | "advisor";

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  is_demo: boolean;
  created_at: string;
};

export type Member = {
  id: string;
  project_id: string;
  profile_id: string | null;
  role: "owner" | "member" | "reviewer";
  display_name: string;
  email: string | null;
  is_demo: boolean;
};

export type Milestone = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: "active" | "completed" | "paused";
};

export type Agent = {
  id: string;
  project_id: string;
  owner_member_id: string;
  name: string;
  agent_type: string | null;
  created_at: string;
};

export type Contribution = {
  id: string;
  project_id: string;
  milestone_id: string | null;
  task_id: string | null;
  contributor_type: ContributorType;
  contributor_member_id: string | null;
  contributor_agent_id: string | null;
  contributor_label: string;
  category: string;
  description: string;
  evidence_url: string | null;
  proposed_impact: Impact | null;
  status: ContributionStatus;
  reviewer_member_id: string | null;
  final_impact: Impact | null;
  review_note: string | null;
  confirmed_at: string | null;
  evidence_hash: string | null;
  supersedes_id: string | null;
  is_demo: boolean;
  created_at: string;
};

export type CategoryWeight = {
  category: string;
  weight: number;
};

export const CONTRIBUTION_CATEGORIES = [
  "code",
  "architecture",
  "product",
  "research",
  "legal_compliance",
  "bd_sales",
  "fundraising",
  "design",
  "content",
  "operations",
  "review_approval",
  "incident_resolution",
  "on_call_availability"
] as const;

export const IMPACTS: Impact[] = ["low", "medium", "high"];
