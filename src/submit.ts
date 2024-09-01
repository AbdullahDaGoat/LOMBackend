import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import { Request, Response } from 'express';

const limiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 1000000000,
    message: 'You can only submit once every 24 hours.',
});

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

    // Handle POST requests
    limiter(req, res, async () => {
        if (req.method === 'POST') {
            const { access_key, from_name, replyto, botCheck, Origin, ...formData } = req.body;

            // Check if botCheck is filled out
            if (botCheck) {
                return res.status(403).json({ message: 'Bot check failed. Submission rejected.' });
            }

            // Validate the access key
            if (access_key !== process.env.ACCESS_KEY) {
                return res.status(403).json({ message: 'Invalid access key' });
            }

            // Validate and sanitize inputs
            const errors: string[] = [];
            if (!validator.isLength(from_name, { min: 1, max: 100 })) {
                errors.push('From name must be between 1 and 100 characters.');
            }
            if (!validator.isEmail(replyto)) {
                errors.push('Reply-to email is invalid.');
            }

            for (const [key, value] of Object.entries(formData)) {
                if (typeof value === 'string') {
                    formData[key] = validator.escape(value);
                    if (validator.isEmpty(formData[key])) {
                        errors.push(`${key} cannot be empty.`);
                    }
                }
            }

            // Return validation errors if any
            if (errors.length > 0) {
                return res.status(400).json({ message: errors });
            }

            // Determine the origin of the submission
            const originText = Origin ? Origin : 'Unknown Origin';

            // Create the email body with a personalized banner
            const emailBody = `
                <div style="padding: 20px; background-color: #f4f4f4; text-align: center;">
                    <h1 style="color: orange;">Legacies Of Men Form Submission Contact Area</h1>
                    <p style="color: #555;">Thank you for reaching out! Below are the details of your submission:</p>
                </div>
                <div style="padding: 20px;">
                    <pre>${JSON.stringify(formData, null, 2)}</pre>
                </div>
            `;

            // Send the email with a custom subject based on the origin
            try {
                await transporter.sendMail({
                    from: `${from_name} <${replyto}>`,
                    to: process.env.EMAIL_TO,
                    subject: `Someone from the **${originText}** named ${from_name} is trying to reach us`,
                    html: emailBody,
                });
                return res.status(200).json({ message: 'Form submitted successfully!' });
            } catch (error) {
                console.error(error);
                return res.status(500).json({ message: 'Failed to send email.' });
            }
        } else {
            return res.status(405).json({ message: 'Method not allowed' });
        }
    });
}