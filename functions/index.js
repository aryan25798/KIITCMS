const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
// ✅ FIX: Use the explicit v1 sub-package for Auth triggers
const authTrigger = require("firebase-functions/v1/auth"); 
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK once
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// --- GLOBAL CONFIGURATION (Gen 2) ---
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

// ==================================================================
// 1. HELPER: GRANT ADMIN ROLE (Gen 2)
// ==================================================================
exports.grantAdminRole = onCall(async (request) => {
    const isSuperAdmin = request.auth && request.auth.token.email === 'admin@system.com'; 
    const isAdmin = request.auth && request.auth.token.admin === true;

    if (!isSuperAdmin && !isAdmin) {
        throw new HttpsError(
            "permission-denied", 
            "You do not have permission to grant admin roles."
        );
    }

    const targetEmail = request.data.email;
    if (!targetEmail) {
        throw new HttpsError("invalid-argument", "Email is required.");
    }

    try {
        const user = await admin.auth().getUserByEmail(targetEmail);
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        return { success: true, message: `User ${targetEmail} is now an admin.` };
    } catch (error) {
        throw new HttpsError("internal", error.message);
    }
});


// ==================================================================
// 2. UPLOAD TIMETABLE (Gen 2)
// ==================================================================
exports.uploadTimetable = onCall(async (request) => {
    if (!request.auth || request.auth.token.admin !== true) {
        throw new HttpsError(
            "permission-denied", 
            "Access Denied: You must be an Administrator to perform this action."
        );
    }
    
    const timetableData = request.data.timetableData;
    if (!timetableData || !Array.isArray(timetableData)) {
        throw new HttpsError(
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
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: request.auth.uid
        });
    }

    try {
        await batch.commit();
        return { success: true, message: `Successfully uploaded timetables for ${Object.keys(sections).length} sections.` };
    } catch (error) {
        console.error("Error committing timetable batch:", error);
        throw new HttpsError("internal", "Failed to save timetable data.");
    }
});


// ==================================================================
// 3. EMERGENCY ALERT (Gen 2)
// ==================================================================
exports.sendEmergencyAlert = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated", 
            "You must be logged in to send an emergency alert."
        );
    }

    const { latitude, longitude, displayName, email } = request.data;
    if (!latitude || !longitude) {
        throw new HttpsError(
            "invalid-argument", 
            "Location data (latitude/longitude) is missing."
        );
    }

    try {
        const uid = request.auth.uid;
        const userName = displayName || "Unnamed User";
        const userEmail = email || request.auth.token.email || "No Email Provided";
        
        const emergencyData = {
            userId: uid,
            userName: userName,
            userEmail: userEmail,
            location: new admin.firestore.GeoPoint(latitude, longitude),
            status: 'active',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        await admin.firestore().collection("emergencies").add(emergencyData);

        const notificationData = {
            message: `SOS ALERT: ${userName} has triggered an emergency alert.`,
            recipientRole: 'admin',
            type: 'emergency_sos',
            priority: 'high',
            isRead: false,
            targetUrl: '/portal/emergency-log',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        await admin.firestore().collection('notifications').add(notificationData);

        console.log(`SOS logged for ${userName} (${uid})`);
        return { success: true, message: "Emergency alert sent successfully." };

    } catch (error) {
        console.error("Error processing emergency alert:", error);
        throw new HttpsError("internal", "Failed to process emergency alert.");
    }
});


// ==================================================================
// 4. ADMIN: DELETE USER (Gen 2)
// ==================================================================
exports.deleteUserAccount = onCall(async (request) => {
    if (!request.auth) {
        console.error("SERVER AUTH FAILED: request.auth is undefined");
        throw new HttpsError("unauthenticated", "Server did not receive Auth Token.");
    }

    const claims = request.auth.token;
    if (claims.admin !== true) {
        throw new HttpsError(
            "permission-denied", 
            `DENIED. Your token says admin is: ${claims.admin}`
        );
    }

    const { targetUid, collectionName } = request.data;
    if (!targetUid) {
        throw new HttpsError("invalid-argument", "Target UID is required.");
    }

    try {
        await admin.auth().deleteUser(targetUid);
        const coll = collectionName || 'users';
        await admin.firestore().collection(coll).doc(targetUid).delete();
        return { success: true, message: "User completely removed from system." };
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            const coll = collectionName || 'users';
            await admin.firestore().collection(coll).doc(targetUid).delete();
            return { success: true, message: "User profile cleaned up." };
        }
        throw new HttpsError("internal", "Failed to delete user: " + error.message);
    }
});


// ==================================================================
// 5. ADMIN: UPDATE STATUS (Gen 2)
// ==================================================================
exports.updateUserStatus = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User is not logged in.");
    }

    if (request.auth.token.admin !== true) {
         throw new HttpsError(
             "permission-denied", 
             "Access Denied: Only admins can change user status."
         );
    }

    const { targetUid, status, collectionName } = request.data; 

    if (!targetUid || !status) {
        throw new HttpsError("invalid-argument", "Target UID and Status are required.");
    }

    try {
        const coll = collectionName || 'users';
        await admin.firestore().collection(coll).doc(targetUid).update({
            status: status,
            statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            statusUpdatedBy: request.auth.uid
        });
        return { success: true, message: `User status updated to ${status}` };
    } catch (error) {
        throw new HttpsError("internal", "Failed to update status: " + error.message);
    }
});

// ==================================================================
// 6. AUTOMATIC ROLE ASSIGNMENT (Gen 1 Fixed)
// ==================================================================
// ✅ FIX: Use the imported authTrigger variable here
exports.processNewUser = authTrigger.user().onCreate(async (user) => {
    const email = user.email || '';
    const uid = user.uid;

    if (email.endsWith('@system.com')) {
        try {
            await admin.auth().setCustomUserClaims(uid, { department: true });

            await admin.firestore().collection('users').doc(uid).set({
                uid: uid,
                email: email,
                displayName: user.displayName || 'Department Staff',
                role: 'department', 
                status: 'approved', 
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                departmentName: email.split('@')[0].toUpperCase() 
            }, { merge: true });

            console.log(`✅ Success: ${email} is now a Department User.`);
        } catch (error) {
            console.error(`❌ Error promoting user ${email}:`, error);
        }
    }
    return null;
});