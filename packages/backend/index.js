const path = require('path')
var ethers = require("ethers");
var express = require("express");
var fs = require("fs");
const https = require('https')
var cors = require('cors')
var bodyParser = require("body-parser");
var app = express();
const MongoClient = require('mongodb').MongoClient
const PythonShell = require('python-shell').PythonShell;
const { debug } = require('console');

let cache = {}
let currentMessage = "I am **ADDRESS** and I would like to sign in to YourDapp, plz!"
let mongoUrl = 'mongodb://127.0.0.1:27018'

app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



MongoClient.connect(mongoUrl, { useNewUrlParser: true })
  .then(client => {
    
    const db = client.db('creations').collection('creations2')

    function checkTaskStatus(task_id) {
      return new Promise((resolve, reject) => {

        let options = {
          mode: 'text',
          pythonPath: '/usr/local/bin/python3',
          pythonOptions: ['-u'], 
          scriptPath: '.',
          args: ['fetch', task_id]
        };

        PythonShell.run('main.py', options, function (err, results) {
          if (err) {
            results = {'result': 'failed', 'output': 'there was a fetch error'}  
            resolve(results)
          }
          results = results.pop()
          results = JSON.parse(results);
          resolve(results);
        })
      })
    }
    

    async function runStatusChecker(task_id, address) {
      let results = await checkTaskStatus(task_id)
      console.log(results)
      if (results['status'] == 'complete') {
        text_input = results['output']['config']['text_inputs'][0]['text']
        index = results['index']
        db.insertOne({
          'address': address,
          'text_input': text_input,
          'idx': index,
          'praise': 0,
          'burn': 0
        })
        .then(result => {
          const _id = result.insertedId;
        })
        .catch(error => console.error(error))
      } 
      else if (results['status'] == 'failed') {
        pass
      }
      else {
        setTimeout(function() {
          runStatusChecker(task_id, address);
        }, 2500);
      }
    }


    app.post('/request_creation', (req, res) => {
      text_input = req.body['text_input']
      address = req.body['address']

      let options = {
        mode: 'text',
        pythonPath: '/usr/local/bin/python3',
        pythonOptions: ['-u'], 
        scriptPath: '.',
        args: ['create', text_input]
      };
      
      PythonShell.run('main.py', options, function (err, results) {
        if (err) {
          results = {'result': 'failed', 'output': 'there was an error'}  
          res.status(200).send(results); 
          //throw err;
        } else {
          let task_id = results.pop()
          results = {'result': task_id}
          runStatusChecker(task_id, address);
          res.status(200).send(results); 
        }
      });

    });
    

    app.post('/get_creations', (req, res) => {
      creations.find().toArray()
        .then(results => {
          res.status(200).send(results); 
        })
        .catch(error => console.error(error))
      }
    )


    if (fs.existsSync('server.key') && fs.existsSync('server.cert')){
      https.createServer({
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.cert')
      }, app).listen(49832, () => {
        console.log('HTTPS Listening: 49832')
      })
    } else {
      var server = app.listen(49832, function () {
        console.log("HTTP Listening on port:", server.address().port);
      });
    }     
  }).catch(error => console.error(error))






