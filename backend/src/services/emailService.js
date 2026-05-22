import nodemailer from 'nodemailer';

let emailTransporter = null;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (emailUser && emailPass) {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
  console.log('[Email Service] Nodemailer (Gmail) initialized successfully.');
} else {
  console.log('[Email Service Warning] EMAIL_USER/EMAIL_PASS not configured. Simulator fallback.');
}

export async function sendEmail({ to, subject, text, html, fromName }) {
  const emailApiUrl = process.env.EMAIL_API_URL;
  const usingEmailApi = !!emailApiUrl;
  const usingRealEmail = !!emailTransporter || usingEmailApi;

  if (usingEmailApi) {
    try {
      const response = await fetch(emailApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to,
          subject,
          body: text,
          htmlBody: html,
          fromName: fromName || 'RxSmart Security'
        })
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.status === 'success') {
          console.log(`[Email Service] Sent email via Google Apps Script API successfully to ${to}`);
          return { success: true, isSimulated: false };
        } else {
          throw new Error(resData.message || 'Apps Script returned error status');
        }
      } else {
        throw new Error(`HTTP status ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error(`[Email Service Error] Google Apps Script API connection failed:`, err.message);
      if (emailTransporter) {
        // Fallback to nodemailer
        return await sendViaNodemailer(to, subject, text, html, fromName);
      }
      throw err;
    }
  } else if (emailTransporter) {
    return await sendViaNodemailer(to, subject, text, html, fromName);
  } else {
    // Simulator Mode
    console.log(`\n==================================================`);
    console.log(`[EMAIL SIMULATION] TO: ${to}`);
    console.log(`[EMAIL SIMULATION] FROM: ${fromName || 'RxSmart Security'}`);
    console.log(`[EMAIL SIMULATION] SUBJECT: ${subject}`);
    console.log(`[EMAIL SIMULATION] TEXT: ${text}`);
    console.log(`==================================================\n`);
    return { success: true, isSimulated: true };
  }
}

async function sendViaNodemailer(to, subject, text, html, fromName) {
  try {
    const mailOptions = {
      from: fromName ? `"${fromName}" <${emailUser}>` : `"RxSmart Security" <${emailUser}>`,
      to,
      subject,
      text,
      html
    };
    await emailTransporter.sendMail(mailOptions);
    console.log(`[Email Service] Sent email successfully to ${to}`);
    return { success: true, isSimulated: false };
  } catch (err) {
    console.error(`[Email Service Error] Nodemailer dispatch failed:`, err.message);
    throw err;
  }
}
