const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Add the 'cors' library to handle requests from your web app
const cors = require('cors')({origin: true});

admin.initializeApp();

// --- YOUR EXISTING TIMETABLE UPLOAD FUNCTION (UNCHANGED) ---
exports.uploadTimetable = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.email !== 'admin@system.com') {
        throw new functions.https.HttpsError("permission-denied", "Only a Super Admin can upload timetables.");
    }
    
    const timetableData = data.timetableData;
    if (!timetableData || !Array.isArray(timetableData)) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "The function must be called with an array of timetable data."
        );
    }

    const db = admin.firestore();
    const batch = db.batch();

    const sections = {};
    timetableData.forEach(row => {
        const sectionName = row.section;
        if (!sectionName) return;

        if (!sections[sectionName]) {
            sections[sectionName] = [];
        }
        sections[sectionName].push({
            day: row.day,
            startTime: row.startTime,
            endTime: row.endTime,
            subject: row.subject,
            room: row.room,
        });
    });

    for (const sectionName in sections) {
        const sectionRef = db.collection("timetables").doc(sectionName);
        batch.set(sectionRef, {
            sectionName: sectionName,
            schedule: sections[sectionName],
        });
    }

    try {
        await batch.commit();
        return { success: true, message: `Successfully uploaded timetables for ${Object.keys(sections).length} sections.` };
    } catch (error) {
        console.error("Error committing timetable batch:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Failed to save timetable data."
        );
    }
});


// --- UPDATED EMERGENCY ALERT FUNCTION (AS A STANDARD HTTP ENDPOINT) ---
exports.sendEmergencyAlert = functions.https.onRequest((req, res) => {
    // Wrap the function in the cors middleware to allow requests from your web app
    cors(req, res, async () => {
        // We only want to handle POST requests
        if(req.method !== 'POST') {
            return res.status(405).send({ error: 'Method Not Allowed' });
        }

        // 1. Manually get the token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('No valid authorization token was provided.');
            return res.status(401).send({ error: 'Unauthorized: No token provided.' });
        }
        const idToken = authHeader.split('Bearer ')[1];

        // 2. Get data from the request body
        const { latitude, longitude, displayName, email } = req.body;
        if (!latitude || !longitude) {
            return res.status(400).send({ error: 'Bad Request: Missing location data.' });
        }

        try {
            // 3. Verify the token using the Admin SDK
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;

            // 4. Use the name/email from the request body, with fallbacks.
            const userName = displayName || "Unnamed User";
            const userEmail = email || "No Email Provided";
            
            // 5. Save the emergency data to Firestore
            const emergencyData = {
                userId: uid,
                userName: userName,
                userEmail: userEmail,
                location: new admin.firestore.GeoPoint(latitude, longitude),
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            };
            await admin.firestore().collection("emergencies").add(emergencyData);

            // 6. Create a priority notification for the admin
            const notificationData = {
                message: `SOS ALERT: ${userName} has triggered an emergency alert.`,
                recipientRole: 'admin', // Target all admins
                type: 'emergency_sos',  // Special type for priority handling
                isRead: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await admin.firestore().collection('notifications').add(notificationData);

            console.log(`Successfully logged emergency and sent notification for ${userName} (${uid})`);
            return res.status(200).send({ success: true, message: "Alert successfully logged and admin notified." });

        } catch (error) {
            console.error("Error processing emergency alert:", error);
            if (error.code === 'auth/id-token-expired' || error.code.startsWith('auth/')) {
                return res.status(401).send({ error: 'Unauthorized: Invalid or expired token.' });
            }
            return res.status(500).send({ error: 'Internal Server Error' });
        }
    });
});
