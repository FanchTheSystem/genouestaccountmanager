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
    // Todo: find if we need a callback
    create_ssh_config: function (user, callback) {
        var filepath = user.home + "/.ssh";
        var filename = "config.test";
        logger.info("Create file", filepath + "/" + filename);
        nunjucks.render('ssh_config', { user: user }, function (err, content) {
            fs.mkdirSync(filepath, { recursive: true }, function (err) {
                fs.chmod(filepath, 0o700);
                fs.writeFile(filepath + "/" + filename, content, function (err) {
                    fs.chmod(filepath + "/" + filename, 0o600);
                });
            });
        });
    }
}
