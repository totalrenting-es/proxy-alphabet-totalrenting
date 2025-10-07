const express = require('express');
const axios = require('axios');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3001;
const urlApi = 'https://partner-acc-2.alphabet.com/lease-quotation-service';

app.use(express.json());

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log')
    }),
    new winston.transports.Console() // Para desarrollo local
  ]
});

async function getServerPublicIP() {
  try {
    const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
    return response.data.ip;
  } catch (error) {
    logger.warn(`No se pudo obtener IP pública del servidor: ${error.message}`);
    return null;
  }
}

app.get('/get-ip', async (req, res) => {
  try {
    const currentIP = await getServerPublicIP();
    if (currentIP) {
      return res.json({ ip: currentIP });
    } else {
      return res.status(500).json({ error: 'No se pudo obtener la IP pública del servidor' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.all('/*', async (req, res) => {
  try {
    console.log('');
    console.log('START REQUEST------------------------------');
    const url = urlApi + req.url;
    const headersToInlcude = ['authorization', 'accept'];

    const headers = {};
    Object.entries(req.headers).forEach(([key, value]) => {
      if (headersToInlcude.includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    const axiosConfig = { method: req.method, url, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      axiosConfig.data = req.body;
    }

    logger.info(`url: ${url}`);
    console.log(`url: ${url}`);
    console.log('');
    console.log(`headers: ${JSON.stringify(headers)}`);
    console.log('');

    const response = await axios(axiosConfig);
    logger.info(`status: ${response.status}`);
    console.log(`status: ${response.status}`);
    console.log('');

    console.log(`data: ${response.data}`);
    console.log('');

    res.status(response.status).send(response.data);
  } catch (error) {
    logger.error(`Error message: ${error}`);
    console.log(`data: ${error.response}`);

    res.status(error.response?.status || 500).send(error.response?.data || 'Error');
  } finally {
    console.log('END REQUEST------------------------------');
  }
});

app.listen(port, () => {
  logger.info(`Proxy escuchando en http://localhost:${port}`);
});
