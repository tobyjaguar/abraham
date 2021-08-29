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
var md5 = require('blueimp-md5')
require('dotenv').config()



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


function authenticate(password) {
  return md5(password) == process.env.BACKEND_PASSWORD_HASH;
}


MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true })
  .then(client => {
    
    const creations = client.db(process.env.DB_NAME).collection('creations')
    const tokens = client.db(process.env.DB_NAME).collection('tokens')

    function checkTaskStatus(task_id, password) {

      return new Promise((resolve, reject) => {

        let authorized = authenticate(password);
        if (!authorized) {
          console.log('Error: not authorized');
          resolve(false);
        }
  
        let options = {
          mode: 'text',
          pythonPath: 'python3',
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
    
    async function update_stats(req, res, type, password) {

      let authorized = authenticate(req.body['password']);
      
      if (!authorized) {
        res.status(500).send('Error: not authorized');
        return;
      }

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

    app.post('/backend/praise', async (req, res) => 
      await update_stats(req, res, 'praise')
    );

    app.post('/backend/burn', async (req, res) => 
      await update_stats(req, res, 'burn')
    );

    async function runStatusChecker(task_id, address, token, password) {

      let results = await checkTaskStatus(task_id, password)
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
          //updateTokenStatus({token: token}, null, password);
        })
        .catch(error => console.error(error))
      } 
      else if (results['status'] == 'failed') {
        updateTokenStatus({token: token}, null, password);
      }
      else {
        setTimeout(function() {
          runStatusChecker(task_id, address, token, password);
        }, 3000);
      }
    }

    app.post('/backend/request_creation', async (req, res) => {
      text_input = req.body['text_input']
      address = req.body['address']
      token = req.body['token']
      password = req.body['password'];

      let authorized = authenticate(password);
      if (!authorized) {
        res.status(500).send('Error: not authorized');
        return;
      }

      results = await getTokens({token: token}, password).then(results => {

        if (results.length > 0) {  

          let options = {
            mode: 'text',
            pythonPath: 'python3',
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
              updateTokenStatus({token: token}, task_id, password);
              results = {'status': 'running', 'task_id': task_id}
              setTimeout(function() {
                runStatusChecker(task_id, address, token, password);
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
    
    app.post('/backend/get_status', async (req, res) => {
      let authorized = authenticate(req.body['password']);
      if (!authorized) {
        res.status(500).send('Error: not authorized');
        return;
      }
      task_id = req.body['task_id']
      let results = await checkTaskStatus(task_id, req.body['password'])
      res.status(200).send(results); 
    });

    app.post('/backend/get_creations', async (req, res) => {

      let authorized = authenticate(req.body['password']);
      if (!authorized) {
        res.status(500).send('Error: not authorized');
        return;
      }

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

    app.post('/backend/delete_creation', async (req, res) => {

      let authorized = authenticate(req.body['password']);
      if (!authorized) {
        res.status(500).send('Error: not authorized');
        return;
      }
      key = req.body['key']
      var success = true;
      creations.remove({_id: ObjectId(key)})
      .then(result => {
        console.log('deleted')
      })
      .catch(error => {
        console.error(error);
        success = false;
      });
      res.status(200).send({'result': success?'success':'fail'});       
    })

    const getTokens = async function(filter, password) {
      return new Promise(resolve => {

        let authorized = authenticate(password);
        if (!authorized) {
          console.log("Error: not authorized");
          resolve(false);
          return;
        }
  
        filter = filter ? filter : {}
        tokens.find(filter).toArray().then(results => {
          resolve(results)
        }).catch(error => {
          resolve(error);
        });
      });
    }

    const updateTokenStatus = async function(filter, status, password) {
      
      return new Promise(resolve => {
        let authorized = authenticate(password);
        if (!authorized) {
          console.log("Error: not authorized")
          resolve(false);
          return;
        }

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


    app.post('/backend/get_tokens', async (req, res) => {

      let authorized = authenticate(req.body['password']);
      if (!authorized) {
        res.status(500).send('Error: not authorized');
        return;
      }

      filter = req.body['address'] ? {address: req.body['address']} : {} 
      if (req.body['exclude_spent']) {
        filter.status = {$in: [null, false]}
      }
      
      results = await getTokens(filter, req.body['password']).then(results => {
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
    

    app.get('/backend', (req, res) => {
      res.status(200).send('this is not what you are looking for'); 
    });
    
    
    app.post('/backend/add_tokens', async (req, res) => {

      let authorized = authenticate(req.body['password']);
      if (!authorized) {
        res.status(500).send('Error: not authorized');
        return;
      }

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

    var server = app.listen(process.env.BACKEND_PORT, function () {
      console.log("HTTP Listening on port:", server.address().port);
    });
         
  }).catch(error => console.error(error))

