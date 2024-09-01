import { Request, Response } from 'express';

let submissionCount = 0; // Track submission count

export function statusHandler(req: Request, res: Response) {
    if (req.method === 'GET') {
        res.status(200).json({
            status: 'OK',
            submissionCount: submissionCount,
            message: 'API is operational',
        });
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}

// Function to increment submission count
export function incrementSubmissionCount() {
    submissionCount++;
}