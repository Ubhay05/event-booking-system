const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes/index');

require('dotenv').config();

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// All routes live under /api/v1
app.use('/api/v1', routes);

// Central error handler — must be last
app.use(errorHandler);

module.exports = app;