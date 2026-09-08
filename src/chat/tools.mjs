// Tools the model can call, and what happens when it does. Every tool ends
// in an email to the team (and a copy to the person), plus an optional
// webhook. The tenant identity attached to a repair comes from the verified
// session, never from the model.
import { reference } from "./crypto.mjs";
import { sendEmail, postWebhook, TEAM_EMAIL, escapeHtml } from "./notify.mjs";

const BRAND = "Sure Lets & Manage";
const PHONE = "+44 (0)20 8158 8434";

export const tools = [
  {
    name: "raise_repair",
    description: "Raise a maintenance job with the Sure Lets & Manage team once the fault, location, timing and access details are known. Returns a job reference to give the tenant.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        category: { type: "string", enum: ["heating_hot_water", "plumbing_leak", "electrical", "gas", "damp_mould", "appliance", "doors_windows_locks", "structure_roof", "pests", "communal_areas", "other"] },
        urgency: { type: "string", enum: ["emergency", "urgent", "routine"], description: "emergency: danger or major loss of a service, told to phone; urgent: health, safety, security or worsening; routine: everything else" },
        summary: { type: "string", description: "One line, e.g. 'Boiler not firing, no hot water since Monday'" },
        details: { type: "string", description: "Everything the tenant said that a contractor needs, including what was seen in any photos" },
        location_in_property: { type: "string" },
        started: { type: "string", description: "When it started, in the tenant's words" },
        access: { type: "string", description: "When someone can attend and whether management keys may be used" },
        contact_phone: { type: "string" },
        reporter_name: { type: "string", description: "Only for unverified reports; empty string otherwise" },
        reporter_address: { type: "string", description: "Only for unverified reports; empty string otherwise" },
        reporter_email: { type: "string", description: "Only for unverified reports; empty string otherwise" },
      },
      required: ["category", "urgency", "summary", "details", "location_in_property", "started", "access", "contact_phone", "reporter_name", "reporter_address", "reporter_email"],
    },
  },
  {
    name: "log_tenancy_question",
    description: "Pass a tenancy question, a requested change to terms, or a request to proceed with a tenancy to a member of staff.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        contact: { type: "string", description: "Email address or phone number" },
        property: { type: "string", description: "Address if known, else empty string" },
        summary: { type: "string", description: "What they asked and anything they want changed or confirmed" },
      },
      required: ["name", "contact", "property", "summary"],
    },
  },
  {
    name: "request_proposal",
    description: "Pass a landlord's request for a rental appraisal and management proposal to the team.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        contact: { type: "string", description: "Email address or phone number" },
        property: { type: "string", description: "Address or area, type and size of property" },
        situation: { type: "string", enum: ["let_with_agent", "self_managed", "vacant", "purchasing", "portfolio", "unknown"] },
        service: { type: "string", enum: ["fully_managed", "rent_collection", "let_only", "portfolio", "undecided"] },
        summary: { type: "string", description: "Anything else the landlord said that matters" },
      },
      required: ["name", "contact", "property", "situation", "service", "summary"],
    },
  },
];

const lines = (obj) => Object.entries(obj).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join("\n");

export async function runTool(name, input, ctx) {
  const ref = reference();
  const when = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });
  if (name === "raise_repair") {
    const verified = Boolean(ctx.tenant);
    const who = verified
      ? { name: ctx.tenant.name, address: ctx.tenant.address, tenancy_reference: ctx.tenant.reference, email: ctx.tenant.email, phone: ctx.tenant.phone }
      : { name: input.reporter_name, address: input.reporter_address, email: input.reporter_email };
    const subject = `${input.urgency === "emergency" ? "EMERGENCY " : input.urgency === "urgent" ? "URGENT " : ""}Repair ${ref}: ${input.summary}${verified ? "" : " (UNVERIFIED)"}`;
    const text = `Repair report ${ref}\nRaised ${when} via the website assistant\nVerified: ${verified ? "yes, by one-time code" : "NO, details unchecked"}\n\n${lines(who)}\n\n${lines({ category: input.category, urgency: input.urgency, summary: input.summary, location: input.location_in_property, started: input.started, details: input.details, access: input.access, contact_phone: input.contact_phone })}\n\nPhotos attached: ${ctx.photos.length}`;
    const attachments = ctx.photos.map((p, i) => ({ filename: `${ref}-photo-${i + 1}.jpg`, data: p.data }));
    const team = await sendEmail({ to: TEAM_EMAIL, subject, text, attachments, replyTo: who.email || undefined });
    if (who.email) {
      await sendEmail({
        to: who.email,
        subject: `Your repair report ${ref}`,
        text: `Thank you for reporting this. Your reference is ${ref}.\n\nWhat you told us: ${input.summary}\nLocation: ${input.location_in_property}\nAccess: ${input.access}\n\nThe team reviews reports the same working day and a contractor will contact you to arrange access. If the problem is dangerous or getting worse, ring ${PHONE}.\n\n${BRAND}`,
      });
    }
    await postWebhook({ type: "repair", reference: ref, raised: new Date().toISOString(), verified, reporter: who, ...input, photos: ctx.photos.length });
    ctx.raised.push({ reference: ref, note: verified ? "The team has it and will be in touch about access." : "The team will check these details against your file before booking." });
    if (!team.ok && !team.skipped) console.error("repair email failed", team.error);
    return `Raised. Reference ${ref}. ${team.ok ? "The team has been emailed." : team.skipped ? "Email delivery is not configured yet, so the report is logged only; tell the person to also ring or email if it is urgent." : "Email delivery failed; tell the person to ring the office to be safe."}`;
  }
  if (name === "log_tenancy_question" || name === "request_proposal") {
    const kind = name === "log_tenancy_question" ? "Tenancy question" : "Proposal request";
    const subject = `${kind} ${ref}: ${(input.property || input.summary).slice(0, 80)}`;
    const text = `${kind} ${ref}\nReceived ${when} via the website assistant\n\n${lines(input)}`;
    const team = await sendEmail({ to: TEAM_EMAIL, subject, text, replyTo: /@/.test(input.contact) ? input.contact : undefined });
    if (/@/.test(input.contact)) {
      const body = name === "request_proposal"
        ? `Thank you. Reference ${ref}.\n\nWhat we noted: ${input.property}. ${input.summary}\n\nA member of the team will be in touch to arrange the appraisal, usually the same working day. Ring ${PHONE} if you would rather talk now.\n\n${BRAND}`
        : `Thank you. Reference ${ref}.\n\nWhat we noted: ${input.summary}\n\nA member of the team will reply, usually the same working day. Ring ${PHONE} if it is urgent.\n\n${BRAND}`;
      await sendEmail({ to: input.contact.trim(), subject: `We have your ${kind.toLowerCase()} (${ref})`, text: body });
    }
    await postWebhook({ type: name, reference: ref, received: new Date().toISOString(), ...input });
    ctx.raised.push({ reference: ref, note: "A person will follow up." });
    return `Logged. Reference ${ref}. ${team.ok ? "The team has been emailed." : "Email delivery is not configured; tell the person to also email admin@surelets.co.uk."}`;
  }
  return `Unknown tool ${name}`;
}

export { escapeHtml };
