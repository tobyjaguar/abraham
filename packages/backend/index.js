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


var ObjectId = require('mongodb').ObjectId;


let cache = {}
let currentMessage = "I am **ADDRESS** and I would like to sign in to YourDapp, plz!"
let mongoUrl = 'mongodb://127.0.0.1:27018'

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

MongoClient.connect(mongoUrl, { useNewUrlParser: true })
  .then(client => {
    
    const creations = client.db('creations').collection('creations3')
    const tokens = client.db('creations').collection('tokens3')

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

    async function runStatusChecker(task_id, address) {
      let results = await checkTaskStatus(task_id)
      if (results['status'] == 'complete') {
        text_input = results['output']['config']['text_inputs'][0]['text']
        index = results['index']
        console.log("the address is", address)
        creations.insertOne({
          'date': new Date(),
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
        pass;
      }
      else {
        setTimeout(function() {
          runStatusChecker(task_id, address);
        }, 3000);
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
          results = {'status': 'failed', 'output': 'there was an error'}  
          res.status(200).send(results);
          console.log(err);
          throw err;
        } else {
          let task_id = results.pop()
          results = {'status': 'running', 'task_id': task_id}
          setTimeout(function() {
            runStatusChecker(task_id, address);
          }, 5000);
          res.status(200).send(results); 
        }
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

    // TOKENS
    app.post('/get_tokens', (req, res) => {
      tokens.find({}).toArray().then(results => {
        Object.keys(results).forEach(function(key){
          if (results[key].date) {
            results[key].date = formatDate(results[key].date) 
          }
        });
        res.status(200).send(results); 
      }).catch(error => console.error(error))
    })

    app.post('/add_tokens', async (req, res) => {
      amount = req.body['amount']
      note = req.body['note']
      address = req.body['address']
      address = address ? address : null;
      let success = true;
      for (var i=0; i<amount; i++) {
        tokens.insertOne({
          'date': new Date(),
          'note': note,
          'address': address,
          'token': randomString(8)
        })
        .then(result => {
          const _id = result.insertedId;          
        })
        .catch(error => {
          console.error(error);
          success = false;
        });  
      }
      res.status(200).send({'result': success?'success':'fail'});       
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






