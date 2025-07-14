const admin = require('firebase-admin');
const path = require('path');

try {
    // Usar el archivo JSON directamente
    const serviceAccount = require('../firebase-service-account.json');
    
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
        console.log('✅ Firebase Admin initialized with service account file');
    }
} catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    console.log('⚠️  API will work without Firebase Auth (database only)');
}

// Exportar auth de forma segura
let auth;
try {
    auth = admin.auth();
} catch (error) {
    console.log('⚠️  Firebase Auth not available');
    auth = null;
}

module.exports = { admin, auth };