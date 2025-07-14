const admin = require('firebase-admin');

let auth = null;

try {
    // Verificar si las variables de entorno están disponibles
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        throw new Error('Variables de entorno de Firebase faltantes');
    }

    // Configurar credenciales desde variables de entorno
    const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Importante para Railway
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };
    
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID
        });
        console.log('✅ Firebase Admin inicializado con variables de entorno');
    }

    // Inicializar auth solo si la app se configuró correctamente
    auth = admin.auth();
    console.log('✅ Firebase Auth disponible');
    
} catch (error) {
    console.error('❌ Error de inicialización del administrador de Firebase:', error.message);
    console.log('⚠️ La API funcionará sin Firebase Auth (solo base de datos)');
    
    // Crear un mock de auth para evitar errores
    auth = {
        verifyIdToken: async () => {
            throw new Error('Firebase Auth no está configurado');
        }
    };
}

module.exports = { admin, auth };