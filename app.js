var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var morgan = require('morgan');
var path = require('path');
var cors = require('cors');
var history = require('connect-history-api-fallback');
var os = require("os");      //ass5.3
var axios = require("axios");   //ass5.3

var productsController = require('./controllers/products');
var ordersController = require('./controllers/orders');

// const { promClient } = require("./models/metrics"); // introduce shared promClient
//const { metricsMiddleware, metricsHandler } = require("./models/metrics");


// Variables
var mongoHost = process.env.MONGODB_HOST || 'localhost';
var mongoDB = process.env.MONGODB_DB || 'scalyDB';
// var mongoPort = process.env.MONGODB_PORT || '27017';
var mongoUser = process.env.MONGODB_USER || undefined;
var mongoPW = process.env.MONGODB_PW || undefined;
var port = process.env.BACKEND_PORT || 5045;

// Connect to MongoDB
// Connection string format: mongodb://root:hugo@localhost:27017/scalyDB
// (or alternatively, without authentication: mongodb://localhost:27017/scalyDB)
if(mongoUser) {
    var mongoUri = "mongodb://"+mongoUser+":"+mongoPW+"@"+mongoHost+":27017/"+mongoDB
} else {
    var mongoUri = "mongodb://"+mongoHost+":27017/"+mongoDB
}

console.log("Trying to connect to "+mongoUri)
mongoose.connect(mongoUri).catch(error => {
    console.error(`Failed to connect to MongoDB with URI: ${mongoUri}`);
    console.error(error.stack);
    process.exit(1);
});

// Create Express app
var app = express();

// const promBundle = require("express-prom-bundle");

// const metricsMiddleware = promBundle({
//     includeMethod: true, 
//     includePath: true, 
//     includeStatusCode: true, 
//     includeUp: true,
//     customLabels: {project_name: 'scalyshop', project_type: 'test_metrics_labels'},
//     promClient: { collectDefaultMetrics: {} } 
// });

// app.use(metricsMiddleware);

// use metricsMiddleware to record HTTP requests
//app.use(metricsMiddleware);

// expose Prometheus to monitor data
//app.get("/metrics", metricsHandler);

// Parse requests of content-type 'application/json'
app.use(bodyParser.json());
// HTTP request logger
app.use(morgan('dev'));
// Enable cross-origin resource sharing for frontend must be registered before api
app.options('*', cors());
app.use(cors());
//app.use(express.json());   //ass5.3

// Function to get CPU usage - ass5.3
function getCpuUsage() {
    const cpus = os.cpus();
    let idle = 0, total = 0;

    cpus.forEach((core) => {
        for (const type in core.times) {
            total += core.times[type];
        }
        idle += core.times.idle;
    });

    return ((1 - idle / total) * 100).toFixed(2); // CPU Usage in %
}

// API endpoint to check CPU usage - ass5.3
app.get("/api/cpu-usage", function(req, res) {
    const cpuUsage = getCpuUsage();
    res.json({ cpuUsage: `${cpuUsage}%` });
});

app.get('/api/pri', function(req, res) {
    console.log('New endpoint hit!');
    res.json({'message': 'pri & rach.'});
});

// API endpoint to check CPU usage and trigger alert if needed
app.get("/api/check-cpu", function(req, res) {
    const cpuUsage = getCpuUsage();
    const threshold = 80; // CPU usage threshold

    if (cpuUsage > threshold) {
        return res.json({ alert: true, message: `High CPU Usage: ${cpuUsage}%` });
    }

    res.json({ alert: false, message: `CPU Usage Normal: ${cpuUsage}%` });
});

// these are some testing routes that may come in handy during the project

app.get('/', function(req, res) {
    res.json({
        'message': 'OK',
        "GET /metrics": "Metrics data"
    });
});

app.get('/api/serverstatus', function(req, res) {
    res.json({'message': 'Your server appears to be live and well.'});
});


// New added: return the current server time

app.get('/api/log-time', function(req, res) {
    let currentTime = new Date().toISOString();
    console.log("Current Server Time:", currentTime);
    res.json({'message': `Logged time: ${currentTime}`});
});


// return an error (on purpose, for monitoring testing)
app.post('/api/error', function(req, res, next) {
    var errorcode = req.query.statuscode || 404;
    console.log("Generating error on purpose: "+errorcode);
    res.status(errorcode).json({'Error': true});
});

// go into an endless loop (this should block the entire server)
app.post('/api/crash', function(req, res, next) {
    console.log("Crash server via an endless loop");
    for(;;);
});

app.use(productsController);

// const axios = require('axios');

// // create a proxy for the product routes
// app.use('/api/products', async (req, res, next) => {
//     try {
//         // build the URL for the new microservice
//         const url = `http://products-service.scalyshop.svc.cluster.local:8081/api/products${req.url}`;

//         // use axios to proxy the request
//         const response = await axios({
//             method: req.method,
//             url: url,
//             data: req.body, // for POST/PUT/PATCH requests, send the request body data
//             headers: req.headers // keep the headers consistent
//         });

//         // return the response from the new microservice to the original client
//         res.status(response.status).json(response.data);
//     } catch (err) {
//         console.error('Error forwarding request:', err);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });



app.use(ordersController);

// Catch all non-error handler for api (i.e., 404 Not Found)
app.use('/api/*', function (req, res) {
    res.status(404).json({ 'message': 'Not Found' });
});

// Configuration for serving frontend in production mode
// Support Vuejs HTML 5 history mode
app.use(history());
// Serve static assets
var root = path.normalize(__dirname + '/..');
var client = path.join(root, 'client', 'dist');
app.use(express.static(client));

// Error handler (i.e., when exception is thrown) must be registered last
var env = app.get('env');
// eslint-disable-next-line no-unused-vars
app.use(function(err, req, res, next) {
    console.error(err.stack);
    var err_res = {
        'message': err.message,
        'error': {}
    };
    if (env === 'development') {
        err_res['error'] = err;
    }
    res.status(err.status || 30);
    res.json(err_res);
});

app.listen(port, function(err) {
    if (err) throw err;
    console.log(`Express server listening on port ${port}, in ${env} mode`);
    console.log(`Backend: http://localhost:${port}/api/`);
    console.log(`Frontend (production): http://localhost:${port}/`);
});

module.exports = app;