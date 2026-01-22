const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Initialize the App
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const args = process.argv.slice(2);
const email = args[0];

if (!email) {
    console.error('❌ Please provide an email address.');
    console.error('Usage: node set-admin.js <user@email.com>');
    process.exit(1);
}

async function grantAdminRole(email) {
  try {
    // 1. SECURITY CHECK: Print the Project ID
    // This tells us exactly WHICH database we are touching.
    const projectId = admin.app().options.credential.projectId;
    console.log(`\n🔍 CONNECTED TO PROJECT: [ ${projectId} ]`);
    console.log(`--------------------------------------------------`);

    // 2. Find the user
    const user = await admin.auth().getUserByEmail(email);
    console.log(`👤 Found User: ${user.uid} (${user.email})`);

    // 3. Set the claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    // 4. VERIFY the claim immediately
    const userRefreshed = await admin.auth().getUser(user.uid);
    const claims = userRefreshed.customClaims;

    if (claims && claims.admin === true) {
        console.log(`✅ SUCCESS! The 'admin' claim is ACTIVE on this project.`);
        console.log(`👉 ACTION REQUIRED: You MUST Log Out and Log In again on the frontend.`);
    } else {
        console.error(`❌ FAILURE: The claim was set but could not be verified.`);
    }
    console.log(`--------------------------------------------------\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'auth/user-not-found') {
        console.error('   -> Check spelling. Users must sign up in the app BEFORE becoming admin.');
    }
  }
}

grantAdminRole(email);