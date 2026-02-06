import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK.
admin.initializeApp();

// Get a reference to the Realtime Database service
const db = admin.database();

// Define the path to your game's score in the Realtime Database
const gameScoreRef = db.ref('currentGame/score');

/**
 * Interface for the data expected from the client for updateGameScore.
 */
interface UpdateGameScoreData {
	type: 'increment' | 'decrement';
}

/**
 * Callable Cloud Function to increment or decrement the game score.
 * This function is called from the client-side.
 *
 * @param {UpdateGameScoreData} data - The data sent from the client. Expected to have a 'type' property: 'increment' or 'decrement'.
 * @param {functions.https.CallableContext} context - The context object, contains information about the caller (e.g., authentication).
 * @returns {Promise<{status: string, message: string}>} A success message or an error if the operation fails or is invalid.
 */
export const updateGameScore = functions.https.onCall(
	async (request) => {
		const data = request.data as UpdateGameScoreData;
		// const context = request;

		// --- Optional: Basic Authentication Check (for later, if you add users) ---
		/*
		if (!context.auth) {
		  throw new functions.https.HttpsError(
			'unauthenticated',
			'The function must be called while authenticated.'
		  );
		}
		*/
		// --- End Optional Auth Check ---

		// Validate the input from the client
		if (!data || !data.type || (data.type !== 'increment' && data.type !== 'decrement')) {
			throw new functions.https.HttpsError(
				'invalid-argument',
				'The function must be called with a "type" argument ("increment" or "decrement").'
			);
		}

		const changeAmount = (data.type === 'increment') ? 1 : -1;
		let newScore: number = 0;

		try {
			// Use a transaction to atomically update the score.
			// This is crucial to prevent race conditions.
			const result = await gameScoreRef.transaction((currentScore: number | null) => {
				// If currentScore is null or not a number, treat it as 0
				const safeCurrentScore = typeof currentScore === 'number' ? currentScore : 0;
				return safeCurrentScore + changeAmount; // Return the new value to be written to the database
			});
			
			if (result.committed) {
				newScore = result.snapshot.val();
			}

			functions.logger.log(`Score updated by ${changeAmount}. New score: ${newScore}`);
			return { status: 'success', message: `Score ${data.type}ed by 1. New score: ${newScore}` };

		} catch (error: any) { // Use 'any' for error type if you're not strictly typing errors
			functions.logger.error("Error updating game score in Realtime Database:", error);
			throw new functions.https.HttpsError(
				'internal',
				'An error occurred while updating the game score.',
				error.message // Include error message for debugging (remove in production if sensitive)
			);
		}
	}
);


/**
 * HTTP-triggered Cloud Function to reset the game score.
 * This is useful for an admin action or game restart.
 * It's an onRequest function, which means it responds to standard HTTP requests.
 */
export const resetGameScore = functions.https.onRequest(async (req, res) => {
	// We'll enforce a POST request for security and idempotence reasons.
	// Although for an admin action, you might want more robust authentication.
	if (req.method !== 'POST') {
		functions.logger.warn(`Attempted reset with method: ${req.method}. Only POST is allowed.`);
		res.status(405).send('Method Not Allowed. Only POST requests are accepted for this endpoint.');
		return;
	}

	try {
		// Set the score directly to 0
		await gameScoreRef.set(0);
		functions.logger.log('Game score reset to 0.');
		res.status(200).send({ status: 'success', message: 'Game score reset to 0.' });
	} catch (error: any) {
		functions.logger.error("Error resetting game score:", error);
		res.status(500).send({ status: 'error', message: 'Failed to reset game score.', details: error.message });
	}
});
