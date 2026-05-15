import type { DocumentFormCode, RaceCategoryRule, TeamContactRole } from "@/lib/types";

export const TEAM_CONTACT_ROLE_OPTIONS: Array<{ value: TeamContactRole; label: string }> = [
  { value: "captain", label: "Team captain" },
  { value: "manager", label: "Team manager" },
  { value: "co_captain", label: "Team co-captain" },
];

export const RACE_CATEGORY_RULE_OPTIONS: Array<{ value: RaceCategoryRule; label: string; summary: string }> = [
  { value: "regular", label: "Regular", summary: "Requires Forms A1, B2, and D" },
  { value: "usdboc", label: "USDBOC", summary: "Requires Forms A1, B1, and D" },
  { value: "invitational", label: "Invitational", summary: "Requires Forms A2, B2, and D" },
];

export const TEAM_FORM_CODES_BY_RULE: Record<RaceCategoryRule, DocumentFormCode[]> = {
  regular: ["A1", "B2", "D"],
  usdboc: ["A1", "B1", "D"],
  invitational: ["A2", "B2", "D"],
};

export function getRequiredTeamFormCodes(ruleSet: RaceCategoryRule | null | undefined): DocumentFormCode[] {
  return TEAM_FORM_CODES_BY_RULE[ruleSet ?? "regular"];
}

export function getContactRoleLabel(role: TeamContactRole | string | null | undefined) {
  return TEAM_CONTACT_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "Team contact";
}

export function getRaceCategoryRuleLabel(ruleSet: RaceCategoryRule | string | null | undefined) {
  return RACE_CATEGORY_RULE_OPTIONS.find((option) => option.value === ruleSet)?.label ?? "Regular";
}

export function getRaceCategoryRuleSummary(ruleSet: RaceCategoryRule | string | null | undefined) {
  return RACE_CATEGORY_RULE_OPTIONS.find((option) => option.value === ruleSet)?.summary ?? RACE_CATEGORY_RULE_OPTIONS[0].summary;
}

export function formatFormCodeList(codes: DocumentFormCode[]) {
  return codes.map((code) => `Form ${code}`).join(", ");
}
