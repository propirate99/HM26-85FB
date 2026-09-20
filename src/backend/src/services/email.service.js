import { Resend } from "resend";
import { env } from "../config/env.js";

let resendClient = null;
function getResend() {
  if (resendClient) return resendClient;
  if (env.resendApiKey) {
    resendClient = new Resend(env.resendApiKey);
    return resendClient;
  }
  return null;
}

const FROM_EMAIL = "Mysuru Swachha Portal <onboarding@resend.dev>";
const ADMIN_EMAIL = "commissioner@mysuru.gov.in";

export async function sendComplaintLoggedEmail({ to, complaint }) {
  const resend = getResend();
  if (!resend) {
    console.log(`[Email] Resend API key not configured. Mocking complaint logged email to: ${to}`);
    return { ok: true, mocked: true };
  }

  const recipient = to && to.includes("@") ? to : ADMIN_EMAIL;
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `🚨 [MCC #${String(complaint._id).slice(-6)}] Complaint Registered: ${complaint.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <div style="background: #0f766e; padding: 20px; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">Mysuru City Corporation · CivicVerify</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Grievance Registration Confirmation</p>
          </div>
          <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Your complaint has been successfully verified and registered with Mysuru City Corporation.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Complaint ID:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">#${String(complaint._id).slice(-6)}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Category:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${complaint.category || "WASTE"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Ward:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${complaint.wardName || complaint.location?.zone || "Mysuru"} (Ward ${complaint.wardNumber || "N/A"})</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Location:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${complaint.googleAddress || complaint.location?.address || "Mysuru City Jurisdiction"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">AI Verification:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #0f766e; font-weight: bold;">${complaint.aiConfidenceScore || 90}/100 Confidence</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Status:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;"><span style="background: #e6fcf5; color: #0f766e; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${complaint.status}</span></td></tr>
            </table>
            ${complaint.photoUrl ? `<p><strong>Photo Evidence:</strong><br/><a href="${complaint.photoUrl}" target="_blank"><img src="${complaint.photoUrl}" style="max-width: 100%; height: auto; border-radius: 6px; margin-top: 8px; border: 1px solid #cbd5e1;" alt="Evidence"/></a></p>` : ""}
            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">This is an automated notification from the MCC Solid Waste Management Command Portal.</p>
          </div>
        </div>
      `,
    });
    return { ok: true, data };
  } catch (err) {
    console.warn(`[Email] Failed to send logged notification via Resend (${err.message})`);
    return { ok: false, error: err.message };
  }
}

export async function sendComplaintStatusEmail({ to, complaint, newStatus, note = "" }) {
  const resend = getResend();
  if (!resend) {
    console.log(`[Email] Resend API key not configured. Mocking status email to: ${to} (status: ${newStatus})`);
    return { ok: true, mocked: true };
  }

  const recipient = to && to.includes("@") ? to : ADMIN_EMAIL;
  const isResolved = newStatus === "RESOLVED";

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `${isResolved ? "✅ [RESOLVED]" : "📢 [STATUS UPDATE]"} Complaint #${String(complaint._id).slice(-6)}: ${complaint.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <div style="background: ${isResolved ? "#16a34a" : "#0284c7"}; padding: 20px; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">Mysuru City Corporation</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Grievance Status Update: <strong>${newStatus}</strong></p>
          </div>
          <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p>The status of your civic complaint has been updated by the MCC Zonal Authority.</p>
            <div style="background: #f8fafc; padding: 16px; border-left: 4px solid ${isResolved ? "#16a34a" : "#0284c7"}; margin: 16px 0;">
              <p style="margin: 0; font-size: 16px;"><strong>Current Status:</strong> ${newStatus}</p>
              ${note ? `<p style="margin: 8px 0 0; font-size: 14px; color: #475569;"><strong>Officer Note:</strong> ${note}</p>` : ""}
            </div>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Complaint ID:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">#${String(complaint._id).slice(-6)}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Title:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${complaint.title}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Location:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${complaint.googleAddress || complaint.location?.address || "Mysuru"}</td></tr>
            </table>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Thank you for helping keep Mysuru clean and livable.</p>
          </div>
        </div>
      `,
    });
    return { ok: true, data };
  } catch (err) {
    console.warn(`[Email] Failed to send status notification via Resend (${err.message})`);
    return { ok: false, error: err.message };
  }
}

export async function sendAdminAlertEmail({ complaint }) {
  return sendComplaintLoggedEmail({ to: ADMIN_EMAIL, complaint });
}
