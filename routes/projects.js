var express = require('express');
var router = express.Router();
// var bcrypt = require('bcryptjs');
// var escapeshellarg = require('escapeshellarg');

const winston = require('winston');
const logger = winston.loggers.get('gomngr');

var CONFIG = require('config');
var GENERAL_CONFIG = CONFIG.general;

// const MAILER = CONFIG.general.mailer;
// const MAIL_CONFIG = CONFIG[MAILER];

// var cookieParser = require('cookie-parser');

// var goldap = require('../routes/goldap.js');
// var notif = require('../routes/notif_'+MAILER+'.js');

const filer = require('../routes/file.js');
var utils = require('./utils');

// var get_ip = require('ipware')().get_ip;

/*
var monk = require('monk'),
    db = monk(CONFIG.mongo.host+':'+CONFIG.mongo.port+'/'+GENERAL_CONFIG.db),
    projects_db = db.get('projects'),
    users_db = db.get('users'),
    events_db = db.get('events');
*/

const MongoClient = require('mongodb').MongoClient;
var mongodb = null;
var mongo_users = null;
var mongo_events = null;
var mongo_projects = null;


var mongo_connect = async function() {
    let url = CONFIG.mongo.url;
    let client = null;
    if(!url) {
        client = new MongoClient(`mongodb://${CONFIG.mongo.host}:${CONFIG.mongo.port}`);
    } else {
        client = new MongoClient(CONFIG.mongo.url);
    }
    await client.connect();
    mongodb = client.db(CONFIG.general.db);
    mongo_users = mongodb.collection('users');
    mongo_events = mongodb.collection('events');
    mongo_projects = mongodb.collection('projects');
};
mongo_connect();

router.get('/project', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send('Not authorized');
        return;
    }
    let user = await mongo_users.findOne({_id: req.locals.logInfo.id});
    if(!user){
        res.status(404).send('User not found');
        return;
    }
    if(GENERAL_CONFIG.admin.indexOf(user.uid) < 0){
        if (! user.projects) {
            res.send([]);
            return;
        } else {
            let projects = await mongo_projects.find({id: {$in : user.projects}}).toArray();
            res.send(projects);
            return;
        }
    } else {
        if (req.query.all === 'true'){
            let projects = await mongo_projects.find({}).toArray();
            res.send(projects);
            return;
        } else {
            if (! user.projects) {
                res.send([]);
                return;
            } else {
                let projects = await mongo_projects.find({id: {$in : user.projects}}).toArray();
                res.send(projects);
                return;
            }
        }
    }
});

router.get('/project/:id', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send('Not authorized');
        return;
    }
    if(! utils.sanitizeAll([req.params.id])) {
        res.status(403).send('Invalid parameters');
        return;
    }
    let user = await mongo_users.findOne({_id: req.locals.logInfo.id});
    if(!user){
        res.status(404).send('User not found');
        return;
    }
    if(GENERAL_CONFIG.admin.indexOf(user.uid) < 0){
        res.status(401).send('Admin only');
        return;
    }
    let project = await mongo_projects.findOne({'id': req.params.id});
    if(!project){
        logger.error('failed to get project', req.params.id);
        res.status(500).send('Error retrieving project');
        return;
    }
    if (! project){
        res.status(404).send('Project ' + req.params.id + ' not found');
        return;
    }
    res.send(project);
});

router.post('/project', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send('Not authorized');
        return;
    }
    if(! utils.sanitizeAll([req.body.id])) {
        res.status(403).send('Invalid parameters');
        return;
    }
    let user = await mongo_users.findOne({_id: req.locals.logInfo.id});
    if(!user){
        res.status(404).send('User not found');
        return;
    }
    if(GENERAL_CONFIG.admin.indexOf(user.uid) < 0){
        res.status(401).send('Not authorized');
        return;
    }
    let owner = await mongo_users.findOne({'uid': req.body.owner});
    if(!owner){
        res.status(404).send('Owner not found');
        return;
    }
    let project = await mongo_projects.findOne({'id': req.body.id});
    if(project){
        res.status(403).send('Not authorized or project already exists');
        return;
    }
    let new_project = {
        'id': req.body.id,
        'owner': req.body.owner,
        'group': req.body.group,
        'size': req.body.size,
        'expire': req.bodyexpire,
        'description': req.body.description,
        'path': req.body.path,
        'orga': req.body.orga,
        'access': req.body.access
    };
    await mongo_projects.insertOne(new_project);
    let fid = new Date().getTime();
    try {
        let created_file = await filer.project_add_project(new_project, fid);
        logger.debug('Created file', created_file);
    } catch(error) {
        logger.error('Add Project Failed for: ' + new_project.id, error);
        res.status(500).send('Add Project Failed');
        return;                        
    }
    await mongo_events.insertOne({'owner': user.uid, 'date': new Date().getTime(), 'action': 'new project creation: ' + req.body.id , 'logs': []});
    res.send({'message': 'Project created'});
    return;
});

router.delete('/project/:id', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send('Not authorized');
        return;
    }
    if(! utils.sanitizeAll([req.params.id])) {
        res.status(403).send('Invalid parameters');
        return;
    }
    let user = await mongo_users.findOne({_id: req.locals.logInfo.id});
    if(!user){
        res.status(404).send('User not found');
        return;
    }
    if(GENERAL_CONFIG.admin.indexOf(user.uid) < 0){
        res.status(401).send('Not authorized');
        return;
    }
    await mongo_projects.remove({'id': req.params.id});
    let fid = new Date().getTime();
    try {
        let created_file = await filer.project_delete_project({'id': req.params.id}, fid);
        logger.debug('Created file', created_file);
    } catch(error){
        logger.error('Delete Project Failed for: ' + req.params.id, error);
        res.status(500).send('Delete Project Failed');
        return;   
    }

    await mongo_events.insertOne({'owner': user.uid, 'date': new Date().getTime(), 'action': 'remove project ' + req.params.id , 'logs': []});

    res.send({'message': 'Project deleted'});

});

router.post('/project/:id', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send('Not authorized');
        return;
    }
    if(! utils.sanitizeAll([req.params.id])) {
        res.status(403).send('Invalid parameters');
        return;
    }
    let user = await mongo_users.findOne({_id: req.locals.logInfo.id});
    if(!user){
        res.status(404).send('User not found');
        return;
    }
    if(GENERAL_CONFIG.admin.indexOf(user.uid) < 0){
        res.status(401).send('Not authorized');
        return;
    }
    let project = await mongo_projects.findOne({'id': req.params.id});
    if(!project){
        res.status(401).send('Not authorized or project not found');
        return;
    }
    let new_project = { '$set': {
        'owner': req.body.owner,
        'group': req.body.group,
        'size': req.body.size,
        'expire': req.body.expire,
        'description': req.body.description,
        'access': req.body.access,
        'orga': req.body.orga,
        'path': req.body.path
    }};
    await mongo_projects.updateOne({'id': req.params.id}, new_project);
    let fid = new Date().getTime();
    new_project.id =  req.params.id;
    try {
        let created_file = await filer.project_update_project(new_project, fid);
        logger.debug('Created file', created_file);
    } catch(error) {
        logger.error('Update Project Failed for: ' + new_project.id, error);
        res.status(500).send('Add Project Failed');
        return;
    }
    
    await mongo_events.insertOne({'owner': user.uid, 'date': new Date().getTime(), 'action': 'update project ' + req.params.id , 'logs': []});
    res.send({'message': 'Project updated'});
});

router.post('/project/:id/request', async function(req, res){
    if(! req.locals.logInfo.is_logged){
        res.status(401).send('Not authorized');
        return;
    }
    if(! utils.sanitizeAll([req.params.id])) {
        res.status(403).send('Invalid parameters');
        return;
    }
    let user = await mongo_users.findOne({_id: req.locals.logInfo.id});
    if(!user){
        res.status(404).send('User not found');
        return;
    }
    let project = await mongo_projects.findOne({'id': req.params.id});
    if(!project){
        res.status(404).send('Project ' + req.params.id + ' not found');
        return;
    }
    //Add to request list
    if(! user.uid === project.owner ){
        res.status(401).send('User ' + user.uid + ' is not project manager for project ' + project.id);
        return;
    }
    let newuser = await mongo_users.findOne({'uid': req.body.user});
    if(!newuser){
        res.status(404).send('User ' + req.body.user + ' not found');
        return;
    }
    if(newuser.projects && newuser.projects.indexOf(project.id) >= 0 && req.body.request === 'add'){
        res.status(403).send('User ' + req.body.user + ' is already in project : cannot add');
        return;
    }
    //Backward compatibility
    if (! project.add_requests){
        project.add_requests = [];
    }
    if (! project.remove_requests){
        project.remove_requests = [];
    }
    if ( project.add_requests.indexOf(req.body.user) >= 0 || project.remove_requests.indexOf(req.body.user) >= 0){
        res.status(403).send('User ' + req.body.user + 'is already in a request : aborting');
        return;
    }
    if (req.body.request === 'add'){
        project.add_requests.push(req.body.user);
    } else if (req.body.request === 'remove') {
        project.remove_requests.push(req.body.user);
    }
    let new_project = { '$set': {
        'add_requests': project.add_requests,
        'remove_requests': project.remove_requests
    }};
    await mongo_projects.updateOne({'id': req.params.id}, new_project);
    await mongo_events.insertOne({'owner': user.uid, 'date': new Date().getTime(), 'action': 'received request ' + req.body.request + ' for user ' + req.body.uid + ' in project ' + project.id , 'logs': []});
    res.send({'message': 'Request sent'});
});

//Admin only, remove request
router.put('/project/:id/request', async function(req, res){
    if(! req.locals.logInfo.is_logged){
        res.status(401).send('Not authorized');
        return;
    }
    if(! utils.sanitizeAll([req.params.id])) {
        res.status(403).send('Invalid parameters');
        return;
    }
    let user = await mongo_users.findOne({_id: req.locals.logInfo.id});
    if(!user){
        res.status(404).send('User not found');
        return;
    }
    if(GENERAL_CONFIG.admin.indexOf(user.uid) < 0){
        res.status(401).send('Not authorized');
        return;
    }
    let project = await mongo_projects.findOne({'id': req.params.id});
    if(!project){
        res.status(401).send('Not authorized or project not found');
        return;
    }
    if (! req.body.user || ! req.body.request){
        res.status(403).send('User and request type are needed');
        return;
    }
    var temp_requests = [];
    if(req.body.request === 'add' ){
        for(var i=0;i<project.add_requests.length;i++){
            if( project.add_requests[i] !== req.body.user ){
                temp_requests.push(project.add_requests[i]);
            }
        }
        project.add_requests = temp_requests;
    } else if (req.body.request === 'remove' ){
        for(let i=0;i<project.remove_requests.length;i++){
            if( project.remove_requests[i] !== req.body.user){
                temp_requests.push(project.remove_requests[i]);
            }
        }
        project.remove_requests = temp_requests;
    }
    let new_project = { '$set': {
        'add_requests': project.add_requests,
        'remove_requests': project.remove_requests
    }};
    await mongo_projects.updateOne({'id': req.params.id}, new_project);
    res.send({'message': 'Request removed'});
});

//Return all projects using this group
router.get('/group/:id/projects', async function(req, res){
    if(! req.locals.logInfo.is_logged){
        res.status(401).send('Not authorized');
        return;
    }
    if(! utils.sanitizeAll([req.params.id])) {
        res.status(403).send('Invalid parameters');
        return;
    }
    let user = await mongo_users.findOne({_id: req.locals.logInfo.id});
    if(!user){
        res.status(404).send('User not found');
        return;
    }
    if(GENERAL_CONFIG.admin.indexOf(user.uid) < 0){
        res.status(401).send('Not authorized');
        return;
    }
    let projects_with_group = await mongo_projects.find({'group': req.params.id}).toArray();
    res.send(projects_with_group);
    res.end();
});

module.exports = router;
