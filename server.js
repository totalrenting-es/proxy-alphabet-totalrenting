const express = require("express");
const axios = require("axios");
const winston = require("winston");
const path = require("path");
const app = express();
const port = 3001;
const urlApi = "https://partner-acc-2.alphabet.com";

app.use(express.json());

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
    logger.info(`Ruta solicitada: ${req.path}`);
    const targetUrl = urlApi + req.path;
    logger.info(`Reenviando petición a: ${targetUrl}`);

    const { host, ...headers } = req.headers;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers,
      data: req.body,
    });
    logger.info(`Respuesta exitosa: ${response.status}`);
    res.status(response.status).send(response.data);
  } catch (error) {
    logger.error(`Error: ${error}`);
    res
      .status(error.response?.status || 500)
      .send(error.response?.data || "Error");
  }
});

app.listen(port, () => {
  logger.info(`Proxy escuchando en http://localhost:${port}`);
});
