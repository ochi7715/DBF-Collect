import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, type PDFForm, type PDFPage } from "pdf-lib";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getRosterPaddlerSeatKeys,
  getRosterRequiredSeatKeys,
  getRosterSeatDefinitions,
  hasCompleteRosterProfile,
  type RosterFormCode,
} from "@/lib/roster-config";
import type { RaceCategory, Team, TeamContactRole, TeamMember } from "@/lib/types";

export type GeneratedFormCode = "A1" | "A2" | "B1" | "B2";

type TeamWithCategory = Team & { race_categories?: RaceCategory | null };

type ContactSummary = {
  contact_role: TeamContactRole;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
};

export type RosterGenerationInput = {
  layout: Record<string, string | null>;
  captainSeatKey: string | null;
};

export type PdfGenerationInput = {
  formCode: GeneratedFormCode;
  team: TeamWithCategory;
  contacts: ContactSummary[];
  members: TeamMember[];
  roster?: RosterGenerationInput;
};

const A1_FIELDS = {
  teamName: "text_1qnu",
  teamAddress: "text_2hsxa",
  teamCity: "text_3qvqq",
  teamState: "text_9rosb",
  teamZip: "text_8rysu",
  teamCountry: "text_6ejkk",
  teamPhone: "text_4vdr",
  teamFax: "text_5shaw",
  teamEmail: "text_7bhzz",
  managerFirstName: "text_10cdwa",
  managerLastName: "text_12vogc",
  managerPhone: "text_11qxwl",
  managerEmail: "text_13bhmg",
  captainFirstName: "text_16rimn",
  captainLastName: "text_14gmgd",
  captainPhone: "text_17zykk",
  captainEmail: "text_15xxvg",
  coCaptainFirstName: "text_18jwbi",
  coCaptainLastName: "text_20sacd",
  coCaptainPhone: "text_19kevg",
  coCaptainEmail: "text_21rrzq",
} as const;

const A2_FIELDS = {
  teamName: "text_1yehw",
  teamAddress: "text_2susa",
  teamCity: "text_3ipyq",
  teamState: "text_4pbjb",
  teamZip: "text_5lfue",
  teamCountry: "text_6wayk",
  teamPhone: "text_9pmjf",
  teamFax: "text_8ynrw",
  teamEmail: "text_7ghbs",
  managerFirstName: "text_10gilq",
  managerLastName: "text_12zokn",
  managerPhone: "text_11frku",
  managerEmail: "text_13xdqu",
  captainFirstName: "text_14unjf",
  captainLastName: "text_16itym",
  captainPhone: "text_15ojjj",
  captainEmail: "text_17ioez",
  coCaptainFirstName: "text_18xgo",
  coCaptainLastName: "text_20jsuh",
  coCaptainPhone: "text_19gcta",
  coCaptainEmail: "text_21zf",
  invitationalOther: "text_30moqn",
  specialOther: "text_31cymi",
} as const;

const B1_FIELDS = {
  teamName: "text_1ljvf",
  manager: "text_2wtxc",
  captain: "text_3dgd",
  coCaptain: "text_4fwuo",
  firstNames: [
    "text_5xlgf",
    "text_7aoza",
    "text_8yd",
    "text_9jtqn",
    "text_10brye",
    "text_11jqve",
    "text_12zulg",
    "text_13fsaa",
    "text_14hdqn",
    "text_15gauy",
    "text_16xvzk",
    "text_17twlo",
    "text_18gpfz",
    "text_19kwvm",
    "text_20ogpl",
    "text_21ptwf",
    "text_22rppd",
    "text_48gtbp",
    "text_49joyq",
    "text_50dmic",
    "text_51hnve",
    "text_52vpew",
    "text_53fuam",
    "text_54txlc",
    "text_55anlt",
    "text_56bqaj",
  ],
  lastNames: [
    "text_6zxvh",
    "text_23vrcl",
    "text_24qdsn",
    "text_25azma",
    "text_26smfd",
    "text_27xxdt",
    "text_28gnt",
    "text_29vuik",
    "text_30jcny",
    "text_31cumi",
    "text_32hlbh",
    "text_33vbvf",
    "text_34kdkr",
    "text_35ov",
    "text_36szji",
    "text_37gbsd",
    "text_38nrwy",
    "text_39oxjs",
    "text_40wluk",
    "text_41upuz",
    "text_42fquj",
    "text_43ycys",
    "text_44qmcq",
    "text_45oucx",
    "text_46hhvv",
    "text_47qhjx",
  ],
  ages: Array.from({ length: 26 }, (_, index) => `text_${57 + index}${[
    "xwto",
    "vmon",
    "kcf",
    "ximq",
    "jgro",
    "epnz",
    "evcp",
    "cgkc",
    "wi",
    "iync",
    "xhgw",
    "cumk",
    "hexl",
    "aleo",
    "jkg",
    "zlat",
    "naba",
    "mk",
    "rekg",
    "swls",
    "acit",
    "afug",
    "lbmh",
    "beim",
    "pwup",
    "dlue",
  ][index]}`),
  genders: Array.from({ length: 26 }, (_, index) => `text_${83 + index}${[
    "cjhd",
    "qzev",
    "zsfz",
    "dhqg",
    "wxft",
    "ncfj",
    "kecu",
    "hply",
    "qsbl",
    "ogrk",
    "wctv",
    "hpsh",
    "ibng",
    "xeze",
    "vsus",
    "avkw",
    "nwjg",
    "azfv",
    "iiwc",
    "jpqh",
    "cha",
    "wxwz",
    "pqks",
    "tpzs",
    "ohif",
    "zqzk",
  ][index]}`),
  telephones: Array.from({ length: 26 }, (_, index) => `text_${112 + index}${[
    "kkgn",
    "aucf",
    "zhal",
    "iljs",
    "eiwm",
    "gxpb",
    "xyas",
    "rqup",
    "velx",
    "bbqt",
    "nskt",
    "rhlc",
    "qldj",
    "rnrz",
    "jgko",
    "nrdg",
    "evkt",
    "ifge",
    "qghr",
    "nxto",
    "moaz",
    "sfjl",
    "uzbd",
    "uvik",
    "qrwv",
    "zzsw",
  ][index]}`),
  photoIds: Array.from({ length: 26 }, (_, index) => `text_${138 + index}${[
    "hrzs",
    "lvqh",
    "ifjt",
    "llpd",
    "kddf",
    "ujox",
    "xpht",
    "yahs",
    "iqag",
    "stdu",
    "mwcs",
    "osmi",
    "oqpf",
    "xzgf",
    "tsfx",
    "skig",
    "neuy",
    "kvbf",
    "liwx",
    "dhvy",
    "hpwv",
    "pcyj",
    "xzpi",
    "dbfe",
    "unyi",
    "iuzm",
  ][index]}`),
} as const;

const B2_FIELDS = {
  teamName: "text_94obg",
  manager: "text_96qzup",
  captain: "text_95lhbp",
  coCaptain: "text_97sddh",
  otherDivision: "text_9yxrv",
  firstNames: [
    "text_10bhai",
    "text_11xxrp",
    "text_12pmb",
    "text_13krjw",
    "text_14wvvo",
    "text_15pfav",
    "text_16bkhw",
    "text_17rkwk",
    "text_18qony",
    "text_19rtcr",
    "text_20ntgz",
    "text_21pdvp",
    "text_22xfjz",
    "text_23cicg",
  ],
  lastNames: [
    "text_24cptz",
    "text_25kutf",
    "text_26vflq",
    "text_27diuw",
    "text_28zvpz",
    "text_29fveo",
    "text_30wcsc",
    "text_31rksa",
    "text_32ldhu",
    "text_33jmup",
    "text_34llyh",
    "text_35eqkb",
    "text_36arqo",
    "text_37xzgq",
  ],
  ages: [
    "text_38s",
    "text_39onjw",
    "text_40xqi",
    "text_41cmmc",
    "text_42cnkq",
    "text_43wesi",
    "text_44kfoq",
    "text_45diuc",
    "text_46hbsf",
    "text_47hmum",
    "text_48jdqz",
    "text_49xgjs",
    "text_50luop",
    "text_51oaoc",
  ],
  genders: [
    "text_52kyzc",
    "text_53bnsr",
    "text_54htlv",
    "text_55elpr",
    "text_56srsm",
    "text_57afgx",
    "text_58dlxh",
    "text_59qbsw",
    "text_60umqn",
    "text_61ulrp",
    "text_62kiox",
    "text_63uzbc",
    "text_64uxap",
    "text_65fvap",
  ],
  telephones: [
    "text_66fxl",
    "text_67rqwt",
    "text_68dsdq",
    "text_69itwu",
    "text_70idbr",
    "text_71awsu",
    "text_72hcfh",
    "text_73jb",
    "text_74wrkn",
    "text_75rtmr",
    "text_76sotj",
    "text_77bwrr",
    "text_78yasp",
    "text_79lvap",
  ],
  photoIds: [
    "text_80jckz",
    "text_81ipup",
    "text_82qcli",
    "text_83ocka",
    "text_84uhnz",
    "text_85wftt",
    "text_86oyed",
    "text_87hqxs",
    "text_88btjl",
    "text_89epdd",
    "text_90uln",
    "text_91ngza",
    "text_92mfqi",
    "text_93vufi",
  ],
} as const;

export async function generateFilledPdf(input: PdfGenerationInput) {
  const templateBytes = await loadTemplatePdfBytes(input.formCode);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  if (input.formCode === "A1") fillA1(form, page, input, boldFont);
  if (input.formCode === "A2") fillA2(form, page, input, boldFont);
  if (input.formCode === "B1") fillB1(form, page, input, boldFont);
  if (input.formCode === "B2") fillB2(form, page, input, boldFont);

  form.updateFieldAppearances(font);
  form.flatten();
  return pdfDoc.save();
}

export function validateRosterForGeneration(input: {
  formCode: RosterFormCode;
  members: TeamMember[];
  roster: RosterGenerationInput;
}) {
  const memberById = new Map(input.members.map((member) => [member.id, member]));
  const seatDefinitions = getRosterSeatDefinitions(input.formCode);
  const validSeatKeys = new Set(seatDefinitions.map((seat) => seat.key));
  const paddlerSeatKeys = new Set(getRosterPaddlerSeatKeys(input.formCode));
  const requiredSeatKeys = getRosterRequiredSeatKeys(input.formCode);
  const seenMemberIds = new Set<string>();
  const problems: string[] = [];

  if (!input.roster.captainSeatKey || !paddlerSeatKeys.has(input.roster.captainSeatKey)) {
    problems.push("Choose a captain seat.");
  }

  for (const requiredSeatKey of requiredSeatKeys) {
    if (!input.roster.layout[requiredSeatKey]) {
      problems.push(`Assign ${formatSeatKey(requiredSeatKey)}.`);
    }
  }

  for (const [seatKey, memberId] of Object.entries(input.roster.layout)) {
    if (!validSeatKeys.has(seatKey) || !memberId) continue;
    if (seenMemberIds.has(memberId)) {
      problems.push("Each team member can only be assigned once.");
      continue;
    }
    seenMemberIds.add(memberId);

    const member = memberById.get(memberId);
    if (!member) {
      problems.push(`A saved assignment points to a missing team member in ${formatSeatKey(seatKey)}.`);
      continue;
    }
    if (!hasCompleteRosterProfile(member)) {
      problems.push(`${member.full_name} is missing age, gender, telephone, or photo ID information.`);
    }
  }

  if (input.roster.captainSeatKey && !input.roster.layout[input.roster.captainSeatKey]) {
    problems.push("The captain marker must be placed on an occupied paddler seat.");
  }

  return [...new Set(problems)];
}

async function loadTemplatePdfBytes(formCode: GeneratedFormCode) {
  const admin = createSupabaseAdminClient();
  const { data: form, error } = await admin
    .from("document_forms")
    .select("template_file_path, template_mime_type")
    .eq("code", formCode)
    .single();

  if (error || !form?.template_file_path) {
    throw new Error(`No template PDF is configured for Form ${formCode}.`);
  }
  if (form.template_mime_type && form.template_mime_type !== "application/pdf") {
    throw new Error(`Form ${formCode} must use a PDF template for generation.`);
  }

  if (form.template_file_path.startsWith("/forms/")) {
    return readFile(path.join(process.cwd(), "public", path.basename(form.template_file_path)));
  }

  const { data, error: downloadError } = await admin.storage.from("form-templates").download(form.template_file_path);
  if (downloadError || !data) throw new Error(`Unable to load Form ${formCode} template.`);
  return new Uint8Array(await data.arrayBuffer());
}

function fillA1(form: PDFForm, page: PDFPage, input: PdfGenerationInput, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  const manager = getContact(input.contacts, "manager");
  const captain = getContact(input.contacts, "captain");
  const coCaptain = getContact(input.contacts, "co_captain");
  const managerName = splitName(getContactName(manager));
  const captainName = splitName(getContactName(captain));
  const coCaptainName = splitName(getContactName(coCaptain));

  setText(form, A1_FIELDS.teamName, input.team.name);
  setText(form, A1_FIELDS.managerFirstName, managerName.firstName);
  setText(form, A1_FIELDS.managerLastName, managerName.lastName);
  setText(form, A1_FIELDS.managerPhone, getContactPhone(manager));
  setText(form, A1_FIELDS.managerEmail, getContactEmail(manager));
  setText(form, A1_FIELDS.captainFirstName, captainName.firstName);
  setText(form, A1_FIELDS.captainLastName, captainName.lastName);
  setText(form, A1_FIELDS.captainPhone, getContactPhone(captain));
  setText(form, A1_FIELDS.captainEmail, getContactEmail(captain));
  setText(form, A1_FIELDS.coCaptainFirstName, coCaptainName.firstName);
  setText(form, A1_FIELDS.coCaptainLastName, coCaptainName.lastName);
  setText(form, A1_FIELDS.coCaptainPhone, getContactPhone(coCaptain));
  setText(form, A1_FIELDS.coCaptainEmail, getContactEmail(coCaptain));

  const division = normalizeDivisionName(input.team.race_categories?.name);
  const ruleSet = input.team.race_categories?.rule_set;
  if (ruleSet === "usdboc") {
    if (division.includes("open")) markBox(page, font, [104, 684, 117, 697]);
    if (division.includes("mixed")) markBox(page, font, [156, 685, 169, 698]);
    if (division.includes("women")) markBox(page, font, [206.872, 685.734, 219.872, 698.734]);
  }
  if (ruleSet === "regular") {
    if (division.includes("open")) markBox(page, font, [106, 655, 119, 668]);
    if (division.includes("mixed")) markBox(page, font, [154, 654, 167, 667]);
    if (division.includes("women")) markBox(page, font, [206, 656, 219, 669]);
  }
}

function fillA2(form: PDFForm, page: PDFPage, input: PdfGenerationInput, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  const manager = getContact(input.contacts, "manager");
  const captain = getContact(input.contacts, "captain");
  const coCaptain = getContact(input.contacts, "co_captain");
  const managerName = splitName(getContactName(manager));
  const captainName = splitName(getContactName(captain));
  const coCaptainName = splitName(getContactName(coCaptain));

  setText(form, A2_FIELDS.teamName, input.team.name);
  setText(form, A2_FIELDS.managerFirstName, managerName.firstName);
  setText(form, A2_FIELDS.managerLastName, managerName.lastName);
  setText(form, A2_FIELDS.managerPhone, getContactPhone(manager));
  setText(form, A2_FIELDS.managerEmail, getContactEmail(manager));
  setText(form, A2_FIELDS.captainFirstName, captainName.firstName);
  setText(form, A2_FIELDS.captainLastName, captainName.lastName);
  setText(form, A2_FIELDS.captainPhone, getContactPhone(captain));
  setText(form, A2_FIELDS.captainEmail, getContactEmail(captain));
  setText(form, A2_FIELDS.coCaptainFirstName, coCaptainName.firstName);
  setText(form, A2_FIELDS.coCaptainLastName, coCaptainName.lastName);
  setText(form, A2_FIELDS.coCaptainPhone, getContactPhone(coCaptain));
  setText(form, A2_FIELDS.coCaptainEmail, getContactEmail(coCaptain));

  const division = normalizeDivisionName(input.team.race_categories?.name);
  if (division.includes("corporate") && !division.includes("youth")) markBox(page, font, [107, 686, 120, 699]);
  else if (division.includes("media")) markBox(page, font, [190, 686, 203, 699]);
  else if (division.includes("senior a")) markBox(page, font, [243, 687, 256, 700]);
  else if (division.includes("senior b")) markBox(page, font, [315, 687, 328, 700]);
  else if (division.includes("charity")) markBox(page, font, [107, 638, 120, 651]);
  else if (division.includes("sponsor")) markBox(page, font, [202, 640, 215, 653]);
  else {
    markBox(page, font, [107, 668, 120, 681]);
    setText(form, A2_FIELDS.invitationalOther, input.team.race_categories?.name ?? "");
  }
}

function fillB1(form: PDFForm, page: PDFPage, input: PdfGenerationInput, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  const roster = requireRoster(input);
  const manager = getContact(input.contacts, "manager");
  const coCaptain = getContact(input.contacts, "co_captain");
  const captainMember = getCaptainMember(input.members, roster);

  setText(form, B1_FIELDS.teamName, input.team.name);
  setText(form, B1_FIELDS.manager, getContactName(manager));
  setText(form, B1_FIELDS.captain, captainMember?.full_name ?? getContactName(getContact(input.contacts, "captain")));
  setText(form, B1_FIELDS.coCaptain, getContactName(coCaptain));
  fillRosterRows(form, "B1", input.members, roster, B1_FIELDS);

  const division = normalizeDivisionName(input.team.race_categories?.name);
  if (division.includes("open")) markBox(page, font, [119, 705, 132, 718]);
  if (division.includes("mixed")) markBox(page, font, [172, 706, 185, 719]);
  if (division.includes("women")) markBox(page, font, [227, 705, 240, 718]);
}

function fillB2(form: PDFForm, page: PDFPage, input: PdfGenerationInput, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  const roster = requireRoster(input);
  const manager = getContact(input.contacts, "manager");
  const coCaptain = getContact(input.contacts, "co_captain");
  const captainMember = getCaptainMember(input.members, roster);

  setText(form, B2_FIELDS.teamName, input.team.name);
  setText(form, B2_FIELDS.manager, getContactName(manager));
  setText(form, B2_FIELDS.captain, captainMember?.full_name ?? getContactName(getContact(input.contacts, "captain")));
  setText(form, B2_FIELDS.coCaptain, getContactName(coCaptain));
  fillRosterRows(form, "B2", input.members, roster, B2_FIELDS);

  const division = normalizeDivisionName(input.team.race_categories?.name);
  const ruleSet = input.team.race_categories?.rule_set;
  if (ruleSet === "regular" && division.includes("open")) markBox(page, font, [69, 667, 82, 680]);
  else if (ruleSet === "regular" && division.includes("mixed")) markBox(page, font, [123, 668, 136, 681]);
  else if (division.includes("corporate youth")) markBox(page, font, [159, 633, 172, 646]);
  else if (division.includes("corporate")) markBox(page, font, [68, 635, 81, 648]);
  else if (division.includes("media")) markBox(page, font, [285, 634, 298, 647]);
  else if (division.includes("charity")) markBox(page, font, [342, 635, 355, 648]);
  else if (division.includes("sponsor")) markBox(page, font, [439, 633, 452, 646]);
  else {
    markBox(page, font, [68, 613, 81, 626]);
    setText(form, B2_FIELDS.otherDivision, input.team.race_categories?.name ?? "");
  }
}

function fillRosterRows(
  form: PDFForm,
  formCode: RosterFormCode,
  members: TeamMember[],
  roster: RosterGenerationInput,
  fields:
    | typeof B1_FIELDS
    | typeof B2_FIELDS
) {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const orderedSeats = getRosterSeatDefinitions(formCode);
  const paddlerSeatKeys = orderedSeats.filter((seat) => seat.kind === "paddler").map((seat) => seat.key);
  const nonPaddlerSeatKeys = orderedSeats.filter((seat) => seat.kind !== "paddler").map((seat) => seat.key);
  const captainSeatKey = roster.captainSeatKey && paddlerSeatKeys.includes(roster.captainSeatKey) ? roster.captainSeatKey : paddlerSeatKeys[0];
  const rowSeatKeys = [
    captainSeatKey,
    ...paddlerSeatKeys.filter((seatKey) => seatKey !== captainSeatKey),
    ...nonPaddlerSeatKeys,
  ];

  rowSeatKeys.forEach((seatKey, index) => {
    const member = memberById.get(roster.layout[seatKey] ?? "");
    const { firstName, lastName } = splitName(member?.full_name);
    setText(form, fields.firstNames[index], firstName);
    setText(form, fields.lastNames[index], lastName);
    setText(form, fields.ages[index], member?.age ? String(member.age) : "");
    setText(form, fields.genders[index], member?.gender ?? "");
    setText(form, fields.telephones[index], member?.telephone ?? "");
    setText(form, fields.photoIds[index], member?.photo_id_number ?? "");
  });
}

function getContact(contacts: ContactSummary[], role: TeamContactRole) {
  return contacts.find((contact) => contact.contact_role === role);
}

function getContactName(contact: ContactSummary | undefined) {
  return contact?.contact_name ?? contact?.profiles?.full_name ?? "";
}

function getContactEmail(contact: ContactSummary | undefined) {
  return contact?.contact_email ?? contact?.profiles?.email ?? "";
}

function getContactPhone(contact: ContactSummary | undefined) {
  return contact?.contact_phone ?? "";
}

function getCaptainMember(members: TeamMember[], roster: RosterGenerationInput) {
  if (!roster.captainSeatKey) return null;
  const captainMemberId = roster.layout[roster.captainSeatKey];
  return members.find((member) => member.id === captainMemberId) ?? null;
}

function requireRoster(input: PdfGenerationInput) {
  if (!input.roster) throw new Error(`Form ${input.formCode} requires a seating layout.`);
  return input.roster;
}

function setText(form: PDFForm, fieldName: string, value: string) {
  form.getTextField(fieldName).setText(value);
}

function markBox(page: PDFPage, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, rect: [number, number, number, number]) {
  page.drawText("X", {
    x: rect[0] + 2,
    y: rect[1] + 1,
    size: Math.max(9, rect[3] - rect[1] - 2),
    font,
  });
}

function splitName(value: string | null | undefined) {
  const parts = (value ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

function normalizeDivisionName(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/womens/g, "women");
}

function formatSeatKey(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
