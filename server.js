const express = require("express");
const axios = require("axios");
const app = express();
const port = 3001;
const urlApi = "https://partner-acc-2.alphabet.com";

app.use(express.json());

app.all("/*", async (req, res) => {
  try {
    console.log(req.path);
    const targetUrl = urlApi + req.path;
    console.log(`Reenviando petición a: ${targetUrl}`);

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: { ...req.headers },
      data: req.body,
    });

    res.status(response.status).send(response.data);
  } catch (error) {
    console.error("Error:", error.message);
    res
      .status(error.response?.status || 500)
      .send(error.response?.data || "Error");
  }
});

app.listen(port, () => {
  console.log(`Proxy escuchando en http://localhost:${port}`);
});
