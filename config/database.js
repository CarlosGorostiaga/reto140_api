const { Pool } = require('pg');

// Railway proporciona DATABASE_URL automáticamente
const connectionString = process.env.DATABASE_URL;

// Configuración alternativa si no hay DATABASE_URL
const dbConfig = connectionString ? {
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
} : {
    host: process.env.PGHOST || process.env.DB_HOST,
    port: process.env.PGPORT || process.env.DB_PORT || 5432,
    user: process.env.PGUSER || process.env.DB_USER,
    database: process.env.PGDATABASE || process.env.DB_NAME,
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
};

const pool = new Pool({
    ...dbConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Aumentado para Railway
});

// Función para verificar conexión con reintentos
const connectWithRetry = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            await pool.connect();
            console.log('✅ PostgreSQL Railway conectado exitosamente');
            return;
        } catch (error) {
            console.log(`❌ Intento de conexión ${i + 1}/${retries} falló:`, error.message);
            if (i === retries - 1) {
                console.error('❌ Error de conexión a la base de datos:', error);
                throw error;
            }
            // Esperar antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};

// Inicializar conexión
connectWithRetry().catch(error => {
    console.error('❌ No se pudo conectar a la base de datos después de varios intentos:', error);
});

const query = async (text, params) => {
    try {
        const result = await pool.query(text, params);
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Manejar cierre graceful
process.on('SIGINT', async () => {
    console.log('Cerrando pool de conexiones...');
    await pool.end();
    process.exit(0);
});

module.exports = { pool, query };