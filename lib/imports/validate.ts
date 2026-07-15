import {
  safeParseContributionPack,
  type ContributionPack,
  type ContributionPackIssue,
  type ContributionPackParseResult,
} from "@/lib/imports/schemas"

const DEFAULT_MAX_PACK_BYTES = 256 * 1024

export type PackActorContext = {
  project: {
    id: string
    name: string
  }
  member: {
    id: string
    display_name: string
  }
  owned_agents: Array<{
    id: string
    name: string
  }>
}

export type ContributionAttribution = {
  contributor_type: "human" | "agent"
  contributor_member_id: string | null
  contributor_agent_id: string | null
  contributor_label: string
}

export type PackActorValidationResult =
  | { success: true; attribution: ContributionAttribution }
  | { success: false; issues: ContributionPackIssue[] }

export function parseContributionPackText(
  text: string,
  options: { maxBytes?: number } = {}
): ContributionPackParseResult {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_PACK_BYTES
  const byteLength = new TextEncoder().encode(text).byteLength

  if (byteLength > maxBytes) {
    return {
      success: false,
      issues: [
        {
          code: "PACK_TOO_LARGE",
          path: "$",
          message: `Contribution Pack must be no larger than ${maxBytes} bytes.`,
        },
      ],
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return {
      success: false,
      issues: [
        {
          code: "INVALID_JSON",
          path: "$",
          message: "Contribution Pack must contain valid JSON.",
        },
      ],
    }
  }

  return safeParseContributionPack(parsed)
}

export function validatePackForActor(
  pack: ContributionPack,
  actor: PackActorContext
): PackActorValidationResult {
  if (pack.project_name !== actor.project.name) {
    return {
      success: false,
      issues: [
        {
          code: "PROJECT_MISMATCH",
          path: "project_name",
          message: "Contribution Pack was created for a different project.",
        },
      ],
    }
  }

  if (pack.contributor_hint.type === "human") {
    return {
      success: true,
      attribution: {
        contributor_type: "human",
        contributor_member_id: actor.member.id,
        contributor_agent_id: null,
        contributor_label: actor.member.display_name,
      },
    }
  }

  const matchingAgents = actor.owned_agents.filter(
    (agent) => agent.name === pack.contributor_hint.display_name
  )

  if (matchingAgents.length !== 1) {
    return {
      success: false,
      issues: [
        {
          code:
            matchingAgents.length === 0 ? "AGENT_NOT_OWNED" : "AMBIGUOUS_AGENT",
          path: "contributor_hint.display_name",
          message:
            matchingAgents.length === 0
              ? "The authenticated member does not own the named agent."
              : "More than one owned agent has this name.",
        },
      ],
    }
  }

  return {
    success: true,
    attribution: {
      contributor_type: "agent",
      contributor_member_id: null,
      contributor_agent_id: matchingAgents[0].id,
      contributor_label: matchingAgents[0].name,
    },
  }
}
