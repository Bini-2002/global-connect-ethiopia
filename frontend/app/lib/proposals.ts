import {
  ProposalAssignedOffice,
  ProposalFormData,
  ProposalRecord,
  ReviewTargetOption,
  SessionProposalData,
} from "@/app/types/proposal";

type ProposalFieldSource = Pick<
  ProposalFormData,
  | "title"
  | "description"
  | "event_type"
  | "start_date"
  | "end_date"
  | "location"
  | "expected_attendees"
  | "budget_estimate"
  | "programOverview"
  | "eventObjectives"
  | "targetAudience"
  | "securityLevel"
  | "personnelCount"
  | "ministryOfficeId"
  | "municipalOfficeId"
  | "policeOfficeId"
> | Pick<
  SessionProposalData,
  | "title"
  | "description"
  | "event_type"
  | "start_date"
  | "end_date"
  | "location"
  | "expected_attendees"
  | "budget_estimate"
  | "programOverview"
  | "eventObjectives"
  | "targetAudience"
  | "securityLevel"
  | "personnelCount"
  | "ministryOfficeId"
  | "municipalOfficeId"
  | "policeOfficeId"
>;

export const PROPOSAL_STATUS_META: Record<
  string,
  { label: string; cls: string; dot?: string }
> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  submitted: { label: "Submitted", cls: "bg-amber-100 text-amber-700", dot: "bg-amber-400" },
  ministry_review: { label: "Ministry Review", cls: "bg-blue-100 text-blue-700", dot: "bg-blue-400" },
  ministry_approved: { label: "Ministry Approved", cls: "bg-teal-100 text-teal-700", dot: "bg-teal-400" },
  municipal_review: { label: "Municipal Review", cls: "bg-purple-100 text-purple-700", dot: "bg-purple-400" },
  approved: { label: "Approved", cls: "bg-green-100 text-green-700", dot: "bg-green-500" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-600", dot: "bg-red-500" },
  changes_requested: {
    label: "Changes Requested",
    cls: "bg-orange-100 text-orange-700",
    dot: "bg-orange-400",
  },
};

export function appendProposalFields(formData: FormData, proposal: ProposalFieldSource): void {
  formData.append("title", proposal.title || "");
  formData.append("description", proposal.description || "");
  formData.append("event_type", proposal.event_type || "");
  formData.append("start_date", proposal.start_date || "");
  formData.append("end_date", proposal.end_date || "");
  formData.append("location", proposal.location || "");
  formData.append("expected_attendees", String(proposal.expected_attendees || 0));
  formData.append("budget_estimate", String(proposal.budget_estimate || 0));
  formData.append("program_overview", proposal.programOverview || "");
  formData.append("event_objectives", proposal.eventObjectives || "");
  formData.append("target_audience", (proposal.targetAudience || []).join(","));
  formData.append("security_level", proposal.securityLevel || "Standard (Private Security)");
  formData.append("personnel_count", String(proposal.personnelCount || 0));
  formData.append("ministry_office_id", proposal.ministryOfficeId || "");
  formData.append("municipal_office_id", proposal.municipalOfficeId || "");
  formData.append("police_office_id", proposal.policeOfficeId || "");
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export function base64ToFile(base64: string, filename: string, mimeType: string): File {
  const arr = base64.split(",");
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mimeType });
}

export function normalizeSessionProposalData(parsed: Record<string, unknown>): SessionProposalData {
  return {
    id: String(parsed.id || `temp-${Date.now()}`),
    title: String(parsed.title || ""),
    description: String(parsed.description || ""),
    event_type: String(parsed.event_type || ""),
    start_date: String(parsed.start_date || ""),
    end_date: String(parsed.end_date || ""),
    location: String(parsed.location || ""),
    expected_attendees: Number(parsed.expected_attendees || 0),
    budget_estimate: Number(parsed.budget_estimate || parsed.budget || 0),
    programOverview: String(parsed.programOverview || parsed.program_overview || ""),
    eventObjectives: String(parsed.eventObjectives || parsed.event_objectives || ""),
    targetAudience: Array.isArray(parsed.targetAudience)
      ? (parsed.targetAudience as string[])
      : Array.isArray(parsed.target_audience)
        ? (parsed.target_audience as string[])
        : ["Youth", "Investors"],
    securityLevel: String(parsed.securityLevel || parsed.security_level || "Standard (Private Security)"),
    personnelCount: Number(parsed.personnelCount || parsed.personnel_count || 0),
    ministryOfficeId: String(parsed.ministryOfficeId || parsed.ministry_office_id || ""),
    municipalOfficeId: String(parsed.municipalOfficeId || parsed.municipal_office_id || ""),
    policeOfficeId: String(parsed.policeOfficeId || parsed.police_office_id || ""),
    document_base64: typeof parsed.document_base64 === "string" ? parsed.document_base64 : null,
    document_name: typeof parsed.document_name === "string" ? parsed.document_name : null,
    document_size: Number(parsed.document_size || 0) || null,
    status: String(parsed.status || "draft"),
    createdAt: String(parsed.createdAt || parsed.created_at || new Date().toISOString()),
  };
}

export async function buildSessionProposalData(
  proposal: ProposalFormData,
  existingId?: string | null,
): Promise<SessionProposalData> {
  const documentData = proposal.documents
    ? {
        document_base64: await fileToBase64(proposal.documents),
        document_name: proposal.documents.name,
        document_size: proposal.documents.size,
      }
    : {
        document_base64: null,
        document_name: null,
        document_size: null,
      };

  return {
    id: existingId || `temp-${Date.now()}`,
    title: proposal.title,
    description: proposal.description,
    event_type: proposal.event_type,
    start_date: proposal.start_date,
    end_date: proposal.end_date,
    location: proposal.location,
    expected_attendees: proposal.expected_attendees,
    budget_estimate: Number(proposal.budget_estimate || 0),
    programOverview: proposal.programOverview,
    eventObjectives: proposal.eventObjectives,
    targetAudience: proposal.targetAudience,
    securityLevel: proposal.securityLevel,
    personnelCount: proposal.personnelCount,
    ministryOfficeId: proposal.ministryOfficeId,
    municipalOfficeId: proposal.municipalOfficeId,
    policeOfficeId: proposal.policeOfficeId,
    ...documentData,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

export function getOfficeLabel(
  office?: ProposalAssignedOffice | ReviewTargetOption | null,
  fallback = "Not assigned",
): string {
  return (
    office?.display_label ||
    office?.office_name ||
    office?.department ||
    office?.city ||
    fallback
  );
}

export function findReviewTargetById(
  options: ReviewTargetOption[],
  userId?: string | null,
): ReviewTargetOption | undefined {
  return options.find((option) => option.user_id === userId);
}

export function proposalToSessionData(proposal: ProposalRecord): SessionProposalData {
  return {
    id: proposal.id,
    title: proposal.title,
    description: proposal.description || "",
    event_type: proposal.event_type || "",
    start_date: proposal.start_date ? proposal.start_date.split("T")[0] : "",
    end_date: proposal.end_date ? proposal.end_date.split("T")[0] : "",
    location: proposal.location || "",
    expected_attendees: proposal.expected_attendees || 0,
    budget_estimate: Number(proposal.budget_estimate || 0),
    programOverview: proposal.program_overview || "",
    eventObjectives: proposal.event_objectives || "",
    targetAudience: proposal.target_audience || ["Youth", "Investors"],
    securityLevel: proposal.security_level || "Standard (Private Security)",
    personnelCount: proposal.personnel_count || 0,
    ministryOfficeId: proposal.office_assignments?.ministry?.user_id || "",
    municipalOfficeId: proposal.office_assignments?.municipal?.user_id || "",
    policeOfficeId: proposal.office_assignments?.police?.user_id || "",
    document_base64: null,
    document_name: proposal.document_name || null,
    document_size: proposal.document_size || null,
    status: proposal.status,
    createdAt: proposal.created_at,
  };
}

export function formatProposalStage(status?: string | null): string {
  return PROPOSAL_STATUS_META[status || ""]?.label || status || "Draft";
}

export function formatOfficeTypeLabel(stage: "ministry" | "municipal" | "police"): string {
  if (stage === "ministry") return "Ministry Office";
  if (stage === "municipal") return "Municipal Office";
  return "Police Notification Office";
}

export function isPersistedProposal(id?: string | null): boolean {
  return Boolean(id && !id.startsWith("temp-"));
}
