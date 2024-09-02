import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import { Request, Response } from 'express';

// Setup rate limiter
const limiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 2, 
    message: 'You can only submit once every 24 hours. ',
});

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function submitHandler(req: Request, res: Response) {
    // Redirect GET requests to /api/status
    if (req.method === 'GET') {
        return res.redirect('/api/status');
    }

    // Log incoming request
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);

    // Handle POST requests with rate limiting
    limiter(req, res, async () => {
        if (req.method === 'POST') {
            let { from_name, replyto, botCheck, Origin, selectedOption, selectedSubOption, firstName, ...formData } = req.body;

            // Set botCheck to false if undefined
            botCheck = botCheck || false;

            // Check if botCheck input value is true (i.e., the bot check was triggered)
            console.log('Bot check:', botCheck);
            if (botCheck) {
                return res.status(400).json({ message: 'Invalid submission' });
            }

            // Validate and sanitize inputs
            const errors: string[] = [];
            if (!validator.isLength(firstName, { min: 1, max: 100 })) { // Validate firstName instead of from_name
                errors.push('First name must be between 1 and 100 characters.');
            }

            // Hardcode replyto to the desired email address
            replyto = 'no-reply@LegaciesOfMen.ContactPage.Website.org';

            for (const [key, value] of Object.entries(formData)) {
                if (typeof value === 'string') {
                    formData[key] = validator.escape(value);
                    if (validator.isEmpty(formData[key])) {
                        if (key !== 'optionalField') {
                            errors.push(`${key} cannot be empty.`);
                        }
                    }
                }
            }

            // Conditional field validation and auto-fill defaults
            if (selectedOption === 'lawEnforcementContact') {
                formData.lawEnforcementName = formData.lawEnforcementName || 'N/A';
                formData.lawEnforcementAgency = formData.lawEnforcementAgency || 'N/A';

                if (!formData.lawEnforcementName) {
                    errors.push('Law enforcement name cannot be empty.');
                }
                if (!formData.lawEnforcementAgency) {
                    errors.push('Law enforcement agency cannot be empty.');
                }
            }

            if (selectedOption === 'pressReleasesAndBranding') {
                formData.nameOfPress = formData.nameOfPress || 'N/A';
                formData.nameOfIndividual = formData.nameOfIndividual || 'N/A';
                formData.certifyRepresentation = formData.certifyRepresentation || 'false';

                if (!formData.nameOfPress) {
                    errors.push('Name of press cannot be empty.');
                }
                if (!formData.nameOfIndividual) {
                    errors.push('Name of individual cannot be empty.');
                }
                if (!formData.certifyRepresentation) {
                    errors.push('Certification of representation cannot be empty.');
                }
            }

            // Return validation errors if any
            if (errors.length > 0) {
                console.log('Validation errors:', errors);
                return res.status(400).json({ message: errors });
            }

            // Remove h-captcha-response
            delete formData['h-captcha-response'];

            // Parse userInfo
            if (formData.userInfo) {
                formData.userInfo = parseUserInfo(formData.userInfo);
            }

            // Create the email body with improved styling
            const emailBody = createEmailBody(formData, firstName, replyto, Origin);

            // Send the email with a custom subject based on the origin and firstName
            try {
                await transporter.sendMail({
                    from: `${from_name} <no-reply@LegaciesOfMen.ContactPage.Website.org>`, // Use firstName instead of from_name
                    to: process.env.EMAIL_TO,
                    subject: `Someone from the User Contact Page named ${firstName} is trying to reach us`, // Use firstName in the subject
                    html: emailBody,
                });
                console.log('Email sent successfully');
                return res.status(200).json({ message: 'Form submitted successfully!' });
            } catch (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ message: 'Failed to send email.' });
            }
        } else {
            console.log('Method not allowed');
            return res.status(405).json({ message: 'Method not allowed' });
        }
    });
}

function parseUserInfo(userInfo: string): Record<string, string> {
    const lines = userInfo.split(';');
    const parsedInfo: Record<string, string> = {}; 
    lines.forEach(line => {
        const [key, value] = line.split(':').map(item => item.trim());
        if (key && value) {
            parsedInfo[key] = value;
        }
    });
    return parsedInfo;
}

function createEmailBody(formData: any, firstName: string, replyto: string, Origin: string): string {
    const formFields = Object.entries(formData).map(([key, value]) => {
        if (typeof value === 'object') {
            return `
                <tr>
                    <td style="font-weight: bold; padding: 10px; border-bottom: 1px solid #ddd;">${key}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                        <pre style="margin: 0; white-space: pre-wrap;">${JSON.stringify(value, null, 2)}</pre>
                    </td>
                </tr>
            `;
        }
        return `
            <tr>
                <td style="font-weight: bold; padding: 10px; border-bottom: 1px solid #ddd;">${key}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${value}</td>
            </tr>
        `;
    }).join('');

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
                <h1 style="color: #ff6600; margin: 0;">Legacies Of Men Form Submission</h1>
                <p style="color: #555;">Contact received from ${firstName} (${replyto})</p>
            </div>
            <div style="padding: 20px; background-color: #ffffff;">
                <h2 style="color: #333;">Submission Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="font-weight: bold; padding: 10px; border-bottom: 1px solid #ddd;">Origin</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${Origin || 'Unknown Origin'}</td>
                    </tr>
                    ${formFields}
                </table>
            </div>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; color: #777; font-size: 12px;">
                <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
        </div>
    `;
}