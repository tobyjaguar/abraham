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
const { debug, Console } = require('console');
const { isError } = require('util');
var ObjectId = require('mongodb').ObjectId;


let MONGOURL = 'mongodb://127.0.0.1:27018'

app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


function randomString(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function formatDate(date) {
  const mm = date.getMonth() >= 10 ? date.getMonth() : `0${date.getMonth()}`;
  const dd = date.getDate() >= 10 ? date.getDate() : `0${date.getDate()}`;
  const hh = date.getHours() >= 10 ? date.getHours() : `0${date.getHours()}`;
  const MM = date.getMinutes() >= 10 ? date.getMinutes() : `0${date.getMinutes()}`;
  return `${date.getFullYear()}-${mm}-${dd} ${hh}:${MM}`;
}


MongoClient.connect(MONGOURL, { useNewUrlParser: true })
  .then(client => {
    
    const creations = client.db('creations').collection('creations4')
    const tokens = client.db('creations').collection('tokens4')

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
            results = {'status': 'failed', 'output': 'there was a fetching error'}  
            resolve(results)
          } else {
            results = JSON.parse(results);
            resolve(results);
          }
        })
      })
    }
    
    async function update_stats(req, res, type) {
      creation_id = req.body['creation_id']
      creations.updateOne(
        {_id: ObjectId(creation_id)}, 
        {$inc: {[type]: 1}}
      )
      .then(result => {
        creations.findOne({_id: ObjectId(creation_id)}).then(result => {
          res.status(200).send({[type]: result[type]}); 
        })
        .catch(error => console.error(error))
      })
      .catch(error => console.error(error))
    }

    app.post('/praise', async (req, res) => 
      await update_stats(req, res, 'praise')
    );

    app.post('/burn', async (req, res) => 
      await update_stats(req, res, 'burn')
    );

    async function runStatusChecker(task_id, address, token) {

      let results = await checkTaskStatus(task_id)
      if (results['status'] == 'complete') {
        text_input = results['output']['config']['text_input']
        index = results['index']
        creations.insertOne({
          'date': new Date(),
          'address': address,
          'text_input': text_input,
          'task_id': task_id,
          'idx': index,
          'praise': 0,
          'burn': 0
        })
        .then(result => {
          const _id = result.insertedId;
          //updateTokenStatus({token: token}, null);
        })
        .catch(error => console.error(error))
      } 
      else if (results['status'] == 'failed') {
        updateTokenStatus({token: token}, null);
      }
      else {
        setTimeout(function() {
          runStatusChecker(task_id, address, token);
        }, 3000);
      }
    }

    app.post('/request_creation', async (req, res) => {
      text_input = req.body['text_input']
      address = req.body['address']
      token = req.body['token']

      results = await getTokens({token: token}).then(results => {

        if (results.length > 0) {  

          let options = {
            mode: 'text',
            pythonPath: '/usr/local/bin/python3',
            pythonOptions: ['-u'], 
            scriptPath: '.',
            args: ['create', text_input]
          };

          PythonShell.run('main.py', options, function (err, results) {

            // something wrong in python script
            if (err) {
              results = {'status': 'failed', 'output': err}  
              res.status(200).send(results);
              throw err;
            } 

            // succeeded in running
            else {              
              let task_id = results.pop()
              updateTokenStatus({token: token}, task_id);
              results = {'status': 'running', 'task_id': task_id}
              setTimeout(function() {
                runStatusChecker(task_id, address, token);
              }, 5000);
              res.status(200).send(results); 
            }
          });
        }

        // token not recognized
        else {
          results = {'status': 'failed', 'output': 'token not recognized'}  
          res.status(200).send(results);
        }

      // something went wrong on get_tokens
      }).catch(err => {
        results = {'status': 'failed', 'output': err}  
        res.status(200).send(results);
        throw err;
      });

    });
    
    app.post('/get_status', async (req, res) => {
      task_id = req.body['task_id']
      let results = await checkTaskStatus(task_id)
      res.status(200).send(results); 
    });

    app.post('/get_creations', async (req, res) => {
      sort_by = req.body['sort_by']
      filter_by = req.body['filter_by']
      filter_by_task = req.body['filter_by_task']
      skip = req.body['skip']
      limit = req.body['limit']
      format_date = req.body['format_date']
      let sort_query = {sort:{date:1}};
      if (sort_by == 'newest') {
        sort_query = {sort:{date:-1}};
      } else if (sort_by =='praise') {
        sort_query = {sort:{praise:-1}};
      } else if (sort_by =='burn') {
        sort_query = {sort:{burn:-1}};
      }
      let filter_query = {}
      if (filter_by !== 'all') {
        filter_query.address = filter_by
      }
      if (filter_by_task) {
        filter_query.task_id = filter_by_task
      }
      console.log(filter_query)
      creations.find(filter_query, sort_query)
        .skip(skip)
        .limit(limit)
        .toArray()
        .then(results => {
          if (format_date) {
            Object.keys(results).forEach(function(key){
              if (results[key].date) {
                results[key].date = formatDate(results[key].date) 
              }
            });
          }
          res.status(200).send(results); 
        })
        .catch(error => console.error(error))
      }
    )

    const getTokens = async function(filter) {
      return new Promise(resolve => {
        filter = filter ? filter : {}
        tokens.find(filter).toArray().then(results => {
          resolve(results)
        }).catch(error => {
          resolve(error);
        });
      });
    }

    const updateTokenStatus = async function(filter, status) {
      
      return new Promise(resolve => {
        var newStatus = (status === null) ? {$unset: {status: 0}} : {$set: {status: status}};
        tokens.updateOne(filter, newStatus).then(result => {
          resolve(true);
        })
        .catch(error => {
          console.error(error);
          resolve(false);
        });
      });
    }

    app.post('/get_tokens', async (req, res) => {
      filter = req.body['address'] ? {address: req.body['address']} : {} 
      if (req.body['exclude_spent']) {
        filter.status = {$in: [null, false]}
      }
      
      results = await getTokens(filter).then(results => {
        Object.keys(results).forEach(function(key){
          if (results[key].date) {
            results[key].date = formatDate(results[key].date) 
          }
        });
        res.status(200).send(results); 
      }).catch(error => {
        res.status(500).send(error);         
      });
    })
    
    app.post('/add_tokens', async (req, res) => {
      amount = req.body['amount']
      note = req.body['note']
      address = req.body['address']
      address = address ? address : null;
      let success = true;
      let newTokens = [];
      for (var i=0; i<amount; i++) {
        var newToken = randomString(8);
        tokens.insertOne({
          'date': new Date(),
          'note': note,
          'address': address,
          'token': newToken
        })
        .then(result => {
          const _id = result.insertedId;          
        })
        .catch(error => {
          console.error(error);
          success = false;
        });
        if (success) {
          newTokens.push(newToken)
        }
      }
      res.status(200).send({'result': success?'success':'fail', 'newTokens': newTokens});       
    })


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






