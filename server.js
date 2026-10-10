const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite que tu app móvil se conecte desde cualquier navegador
app.use(cors());
app.use(express.json());

// Conexión segura a la Base de Datos Remota
// En producción, es mejor guardar esto en una "Variable de Entorno" llamada DATABASE_URL
const conexionString = process.env.DATABASE_URL || "AQUÍ_PEGA_TU_CADENA_DE_CONEXION_DE_SUPABASE_O_NEON";

const pool = new Pool({
  connectionString: conexionString,
  ssl: { rejectUnauthorized: false } // Requerido para conexiones seguras en la nube
});

// 1. RUTA PARA GUARDAR UN REGISTRO (POST)
app.post('/api/registro', async (req, res) => {
  const { fecha, ordinarias, extras, actividades } = req.body;
  
  try {
    const query = `
      INSERT INTO registros_horas (fecha, horas_ordinarias, horas_extras, actividades) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (fecha) 
      DO UPDATE SET horas_ordinarias = $2, horas_extras = $3, actividades = $4
      RETURNING *;
    `;
    // El ON CONFLICT hace que si registras el mismo día dos veces, se actualice en lugar de dar error
    
    const result = await pool.query(query, [fecha, ordinarias, extras, actividades]);
    res.status(201).json({ OK: true, mensaje: "Guardado en la nube", datos: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ OK: false, error: "Error al guardar en la base de datos remota" });
  }
});

// 2. RUTA PARA OBTENER EL HISTORIAL Y TOTALES (GET)
app.get('/api/historial', async (req, res) => {
  try {
    const queryHistorial = 'SELECT * FROM registros_horas ORDER BY fecha DESC LIMIT 10;';
    const queryTotales = 'SELECT SUM(horas_extras) as total_extras, COUNT(id) as dias FROM registros_horas;';
    
    const historial = await pool.query(queryHistorial);
    const totales = await pool.query(queryTotales);
    
    res.json({
      historial: historial.rows,
      totales: totales.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener datos de la nube" });
  }
});

app.listen(PORT, () => console.log(`Servidor remoto corriendo en puerto ${PORT}`));
