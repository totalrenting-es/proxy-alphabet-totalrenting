const express = require("express");
const winston = require("winston");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 3001;
const urlApi = "https://partner-acc-2.alphabet.com";

app.use(express.json());

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, "logs", "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(__dirname, "logs", "combined.log"),
    }),
    new winston.transports.Console(), // Para desarrollo local
  ],
});

app.all("/*", async (req, res) => {
  try {
    logger.info(`=== NUEVA PETICIÓN ===`);
    logger.info(`Ruta solicitada: ${req.path}`);
    logger.info(`Query params: ${JSON.stringify(req.query)}`);

    const targetUrl =
      urlApi +
      req.path +
      (req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "");
    logger.info(`URL completa: ${targetUrl}`);
    logger.info(`Método HTTP: ${req.method}`);

    // Preparar headers (excluyendo algunos que pueden causar problemas)
    const { host, ...headers } = req.headers;
    headers.host = "85.208.102.46";
    // Log completo de todos los headers que se van a enviar
    logger.info(`Headers enviados a la API:`);
    Object.entries(headers).forEach(([key, value]) => {
      logger.info(`  ${key}: ${value}`);
    });

    // Log del body si existe
    if (req.body && Object.keys(req.body).length > 0) {
      logger.info(`Body enviado: ${JSON.stringify(req.body, null, 2)}`);
    } else {
      logger.info(`Body: Sin contenido`);
    }

    // Configurar opciones para fetch
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    // Agregar body solo si no es GET o HEAD
    if (
      req.method !== "GET" &&
      req.method !== "HEAD" &&
      req.body &&
      Object.keys(req.body).length > 0
    ) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    // Log de los datos exactos que se envían con fetch
    logger.info(`=== DATOS DE LA PETICIÓN FETCH ===`);
    logger.info(`URL: ${targetUrl}`);
    logger.info(`Método: ${fetchOptions.method}`);
    logger.info(
      `Headers fetch: ${JSON.stringify(fetchOptions.headers, null, 2)}`
    );
    if (fetchOptions.body) {
      logger.info(`Body fetch: ${fetchOptions.body}`);
    }
    logger.info(`================================`);

    const response = await fetch(targetUrl, fetchOptions);

    logger.info(`=== RESPUESTA DE LA API ===`);
    logger.info(`Status: ${response.status}`);
    logger.info(`Status Text: ${response.statusText}`);

    // Log de headers de respuesta
    logger.info(`Headers de respuesta:`);
    response.headers.forEach((value, name) => {
      logger.info(`  ${name}: ${value}`);
    });

    // Obtener el contenido de la respuesta
    const contentType = response.headers.get("content-type");
    let responseData;

    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
      logger.info(`Respuesta JSON: ${JSON.stringify(responseData, null, 2)}`);
    } else {
      responseData = await response.text();
      logger.info(`Respuesta Text: ${responseData}`);
    }

    // Copiar headers de respuesta relevantes
    response.headers.forEach((value, name) => {
      // Excluir algunos headers que Express maneja automáticamente
      if (
        !["content-encoding", "transfer-encoding", "connection"].includes(
          name.toLowerCase()
        )
      ) {
        res.setHeader(name, value);
      }
    });

    // Enviar respuesta con el mismo status y datos
    res.status(response.status).send(responseData);
    logger.info(`=== FIN PETICIÓN EXITOSA ===`);
  } catch (error) {
    logger.error(`=== ERROR EN PETICIÓN ===`);
    logger.error(`Error: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);

    // Log adicional para errores de fetch
    if (error.cause) {
      logger.error(`Error causa: ${JSON.stringify(error.cause)}`);
    }

    // Si hay información de respuesta en el error
    if (error.response) {
      logger.error(`Error status: ${error.response.status}`);
      logger.error(`Error data: ${JSON.stringify(error.response.data)}`);
    }

    res.status(500).send({ error: "Error interno del proxy" });
    logger.error(`=== FIN PETICIÓN CON ERROR ===`);
  }
});

app.listen(port, () => {
  logger.info(`=== SERVIDOR INICIADO ===`);
  logger.info(`Proxy escuchando en http://localhost:${port}`);
  logger.info(`API objetivo: ${urlApi}`);
  logger.info(`========================`);
});
