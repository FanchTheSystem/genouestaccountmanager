const nunjucks = require('nunjucks');
const winston = require('winston');
const logger = winston.loggers.get('gomngr');
var CONFIG = require('config');

// Todo: move utils function which manage file content here
// var utils = require('../routes/utils.js');

// Todo use conf for scripts directory
nunjucks.configure('scripts', { autoescape: true });
