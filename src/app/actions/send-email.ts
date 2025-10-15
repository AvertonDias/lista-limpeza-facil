"use server";

import { Resend } from 'resend';

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
}

export async function sendEmailAction(params: EmailParams) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("Resend API key is not configured. Please set RESEND_API_KEY in your .env file.");
    return { success: false, message: "Email configuration is missing." };
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error('Resend Error:', error);
      // We don't return the error to the client to avoid exposing server details
      return { success: false, message: "Failed to send email." };
    }

    console.log('Resend Success:', data);
    return { success: true, message: "Email sent successfully." };
  } catch (exception) {
    console.error('Send Email Action Exception:', exception);
    return { success: false, message: "An unexpected error occurred." };
  }
}
