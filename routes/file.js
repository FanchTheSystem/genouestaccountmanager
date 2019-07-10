const nunjucks = require('nunjucks');
const winston = require('winston');
const logger = winston.loggers.get('gomngr');
var CONFIG = require('config');
var fs = require('fs');

// Todo: move utils function which manage file content here
// var utils = require('../routes/utils.js');

// Todo use conf for scripts directory
nunjucks.configure('templates', { autoescape: true });


module.exports = {
    create_ssh_config: function (name, user) {
        return new Promise( function (resolve, reject) {
            var filepatouih = user.home + "/.ssh";
            var filename = "config.test";
            nunjucks.render('ssh_config', { user: user }, function (err, content) {
                if (err) {
                    logger.error(err);
                } else {
                    fs.mkdirSync(filepath, { recursive: true });
                    fs.chmodSync(filepath, 0o700);
                    fs.writeFileSync(filepath + "/" + filename, content);
                    fs.chmodSync(filepath + "/" + filename, 0o600);
                }
                return ('test promise');
            });
        });
    }
};
