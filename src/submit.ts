import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import { Request, Response } from 'express';

// Setup rate limiter
const limiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'You can only submit once every 24 hours.',
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
            const { from_name, replyto, botCheck, Origin, selectedOption, selectedSubOption, ...formData } = req.body;

            // Check if botCheck input value is checked (if it is return invalid submission)
            console.log('Bot check:', botCheck);
            if (botCheck) {
                return res.status(400).json({ message: 'Invalid submission' });
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
                        if (key !== 'optionalField') {
                            errors.push(`${key} cannot be empty.`);
                        }
                    }
                }
            }

            // Conditional field validation
            if (selectedOption === 'lawEnforcementContact' && (
                !formData.lawEnforcementName || !formData.lawEnforcementAgency)) {
                errors.push('Law enforcement name and agency are required for this option.');
            }

            if (selectedOption === 'pressReleasesAndBranding' && (
                !formData.nameOfPress || !formData.nameOfIndividual || !formData.certifyRepresentation)) {
                errors.push('Press details and certification are required for this option.');
            }

            // Return validation errors if any
            if (errors.length > 0) {
                console.log('Validation errors:', errors);
                return res.status(400).json({ message: errors });
            }

            // Determine the origin of the submission
            const originText = Origin ? Origin : 'Unknown Origin';
            console.log('Submission origin:', originText);

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