const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
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
        
        // Also update Firestore to keep it in sync
        await admin.firestore().collection('users').doc(user.uid).set({
            role: 'admin',
            status: 'approved'
        }, { merge: true });

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
// 4. ADMIN: DELETE USER (Gen 2 - WITH DEEP CLEANUP)
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

    // Default to 'users' if not provided, but frontend should provide 'mentors' for mentors.
    const coll = collectionName || 'users';

    try {
        // 1. Delete from Authentication
        await admin.auth().deleteUser(targetUid);
        
        // 2. Delete Main Profile Document
        await admin.firestore().collection(coll).doc(targetUid).delete();

        // 3. ✅ DEEP CLEANUP: If it's a Mentor, delete related data
        if (coll === 'mentors') {
            const db = admin.firestore();
            const batch = db.batch();

            // A. Delete pending requests sent TO this mentor
            const requestsQuery = await db.collection('mentorRequests').where('mentorId', '==', targetUid).get();
            requestsQuery.forEach(doc => batch.delete(doc.ref));

            // B. Delete active connections with students
            // Note: This is harder as studentConnections ID is the STUDENT ID.
            // We search for connections where this mentor is the assigned mentor.
            const connectionsQuery = await db.collection('studentConnections').where('mentorId', '==', targetUid).get();
            connectionsQuery.forEach(doc => batch.delete(doc.ref));

            // C. Commit Batch
            await batch.commit();
            console.log(`🧹 Deep cleaned data for mentor ${targetUid}`);
        }

        return { success: true, message: "User and all related data removed." };
    } catch (error) {
        // If Auth user is already gone, just clean up Firestore
        if (error.code === 'auth/user-not-found') {
            const coll = collectionName || 'users';
            await admin.firestore().collection(coll).doc(targetUid).delete();
            return { success: true, message: "User profile cleaned up (Auth was already missing)." };
        }
        throw new HttpsError("internal", "Failed to delete user: " + error.message);
    }
});


// ==================================================================
// 5. ADMIN: UPDATE STATUS (Gen 2 - DYNAMIC COLLECTION SUPPORT)
// ==================================================================
exports.updateUserStatus = onCall(async (request) => {
    // 1. Auth Checks
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User is not logged in.");
    }
    if (request.auth.token.admin !== true) {
         throw new HttpsError("permission-denied", "Access Denied: Only admins can change user status.");
    }

    const { targetUid, status, collectionName } = request.data; 
    if (!targetUid || !status) {
        throw new HttpsError("invalid-argument", "Target UID and Status are required.");
    }

    try {
        const coll = collectionName || 'users';
        
        // 2. Update Firestore Status
        await admin.firestore().collection(coll).doc(targetUid).update({
            status: status,
            statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            statusUpdatedBy: request.auth.uid
        });

        // 3. ✅ DYNAMIC PERMISSIONS: Assign/Revoke Claims based on Status
        // Only applies to the 'users' collection (where dept/admin staff live)
        if (coll === 'users') {
            const userDoc = await admin.firestore().collection('users').doc(targetUid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const userRole = userData.role;

                if (status === 'approved') {
                    // GRANT Privileges only when Admin approves
                    if (userRole === 'department') {
                        await admin.auth().setCustomUserClaims(targetUid, { department: true });
                        console.log(`✅ Granted Department Claim to ${targetUid}`);
                    } else if (userRole === 'admin') {
                        await admin.auth().setCustomUserClaims(targetUid, { admin: true });
                        console.log(`✅ Granted Admin Claim to ${targetUid}`);
                    }
                } else {
                    // REVOKE Privileges (if pending or rejected)
                    await admin.auth().setCustomUserClaims(targetUid, {}); 
                    console.log(`🚫 Revoked Claims for ${targetUid}`);
                }
            }
        } 
        
        // Mentors don't strictly need Custom Claims for basic access (Firestore Rules handle it),
        // but if you wanted to add a 'mentor' claim in the future, you would add an 
        // `else if (coll === 'mentors')` block here.

        return { success: true, message: `User status updated to ${status}` };
    } catch (error) {
        console.error("Update Status Error:", error);
        throw new HttpsError("internal", "Failed to update status: " + error.message);
    }
});

// ==================================================================
// 6. AUTOMATIC ROLE ASSIGNMENT (Gen 1 - UPDATED TO PENDING)
// ==================================================================
exports.processNewUser = authTrigger.user().onCreate(async (user) => {
    const email = user.email || '';
    const uid = user.uid;

    // Only process system emails. Regular students/mentors are handled by client-side signup flow.
    if (email.endsWith('@system.com')) {
        try {
            // ✅ CHANGE: Do NOT set custom claims yet.
            // Just mark them as 'pending' in Firestore.
            
            await admin.firestore().collection('users').doc(uid).set({
                uid: uid,
                email: email,
                displayName: user.displayName || 'Department Staff',
                role: 'department', 
                status: 'pending', // <--- Forced Pending State for Safety
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                departmentName: email.split('@')[0].toUpperCase() 
            }, { merge: true });

            console.log(`📝 New Department User Registered (Pending Approval): ${email}`);
        } catch (error) {
            console.error(`❌ Error processing user ${email}:`, error);
        }
    }
    return null;
});