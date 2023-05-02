require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const addOrUpdateGame = require("./addGame");
const Game = require("./models/Game.js");
const cors = require("cors");
const compression = require('compression');
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000
const DB_SERVER_PROTOCOL = process.env.DB_SERVER_PROTOCOL || "mongodb"
const DB_SERVER_DOMAIN = process.env.DB_SERVER_DOMAIN || "localhost"
const DB_SERVER_PORT = process.env.DB_SERVER_PORT || 27017
const DB_GAMEFILTER_DBNAME = process.env.DB_GAMEFILTER_DBNAME || "gamefilter"

app.get('/api', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 's-max-age=1, stale-while-revalidate');
  res.end(`Hello!`);
});

// Connect to MongoDB
mongoose.connect(`${DB_SERVER_PROTOCOL}://${DB_SERVER_DOMAIN}:${DB_SERVER_PORT}/${DB_GAMEFILTER_DBNAME}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to database!');
})
.catch((err) => {
  console.error('Error connecting to database:', err);
});

let allowedOrigins = [];
let whitelistFile = path.resolve(process.cwd(), "config", process.env.CORS_WHITELIST_FILENAME);
if(process.env.NODE_ENV === "production")
  fs.readFileSync(`/etc/secrets/${process.env.CORS_WHITELIST_FILENAME}`)

// Load CORS whitelist from file
fs.readFile(whitelistFile, "utf-8", (err, data) => {
  if (err) {
    console.error("Error reading whitelist:", err);
    return;
  }

  // Parse each line of the file as a regular expression and add it to the array
  const lines = data.trim().split("\n");
  for (let line of lines) {
    allowedOrigins.push(new RegExp(line.trim()));
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Enable CORS from allowed origins
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(regex => regex.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Enable compression middleware
app.use(compression());

// Get game by ID
app.get("/api/games/:gameId", (req, res) =>
{
  console.log(`/api/games/${req.params.gameId} from ${req.ip}`);

  // Game data should only update once per day, max...
  // So we set a cache control to help maximize performance
  res.set({
    'Cache-Control': 'public, max-age=86400' // max-age in seconds
  });

  Game.find({gameId: req.params.gameId})
    .then(game => {
      res.json(game);
    })
    .catch(err => {
      res.status(404).json({ message: err.message });
    });
});

// Handle login authentication (Discord)
app.get("/api/auth", async (req, res) =>
{
  console.log('Incoming Auth request...');
  try {
    if(!(req.query && req.query.provider && req.query.from)) {
      res.status(400).json({ message: 'Bad auth request: Wrong query parameters' });
      console.warn('> Bad auth request: Wrong query parameters')
      return;
    }
    
    console.log(`> /api/auth/${req.query.provider} from ${req.ip}`);
    /*
    if(req.query.from !== req.ip) {
      res.status(400).json({ message: 'Bad auth request: IP address mismatch' });
      console.warn('> Bad auth request: IP address mismatch')
      return;
    }
    */

    // Handle authentication based on requested provider
    switch(req.query.provider) {
      case 'discord':
        res.status(200).json({ message: 'ok', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/200' });
        break;
      case 'steam':
        res.status(501).json({ message: 'Provider not yet implemented', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/501' });
        break;
      case 'microsoft':
        res.status(501).json({ message: 'Provider not yet implemented', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/501' });
        break;
      case 'epic':
        res.status(501).json({ message: 'Provider not yet implemented', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/501' });
        break;
      default:
        res.status(400).json({ message: 'Unknown provider', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400' });
        break;
    }
    console.log('> Finished processing auth request')
  } catch(error) {
    res.status(500).json({ message: error });
    console.error('> ${error}')
  }
});

// Add a game
app.post('/api/games', async (req, res) => {
  console.log('Incoming game POST request...');
  try {
    const game = req.body;
    console.log(`> [game]:\n${JSON.stringify(game)}`);
    const updatedGame = await addOrUpdateGame(game);
    res.status(200).json(updatedGame);
  } catch (error) {
    res.status(500).json({ message: error });
  }
  console.log('> Finished processing game POST request')
});

module.exports = app;