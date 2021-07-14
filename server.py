import os
import time
import json
import glob
import PIL
import random
import pathlib
import logging
from datetime import datetime
from flask import Flask, request, render_template, send_from_directory
from flask import session, flash, redirect, url_for, jsonify
import generator
from eden.client import Client
from eden.datatypes import Image


app = Flask(__name__)
app.config['SECRET_KEY'] = 'top-secret!'

# setup logging
logging.basicConfig(filename='abraham4.log', 
                    filemode='a', 
                    level=logging.DEBUG,
                    datefmt='%H:%M:%S',
                    format='%(asctime)s,%(msecs)d %(name)s %(levelname)s %(message)s')

# text-to-image client
client = Client(url = 'http://127.0.0.1:5656', username='abraham', timeout= 990000)
#setup_response = client.setup()


@app.route('/get_creations', methods=['GET'])
def get_creations():
    creations = []
    results = glob.glob('static/results/*')
    for result in results:
        image_path = '{}/image.jpg'.format(result)
        config_path = '{}/config.json'.format(result)
        if not os.path.isfile(config_path) or not os.path.isfile(image_path):
            continue
        with open(config_path) as f:
            config = json.load(f)
        text_input = config['text_inputs'][0]['text']
        creation = {
            'image': image_path, 
            'text_input': text_input, 
            'time': datetime.fromtimestamp(pathlib.Path(image_path).stat().st_mtime)
        }
        creations.append(creation)
    creations = sorted(creations, key=lambda k: k['time'], reverse=True)
    return jsonify(creations)
    

@app.route('/request_creation', methods=['POST'])
def request_creation():
    text_input = request.form['text_input']
    
    config = {
        'text_inputs': [{
            'text': text_input,
            'weight': 10.0
        }],
        'width': 512,
        'height': 512,
        'num_octaves': 3,
        'octave_scale': 2.0,
        'num_iterations': [100, 200, 300],
        'weight_decay': 0.1,
        'learning_rate': 0.1,
        'lr_decay_after': 400,
        'lr_decay_rate': 0.995
    }
    
    response = client.run(config)
    logging.info(response)
    task_id = response['token']
    result = {'task_id': task_id}
    
    return jsonify({}), 202, result


@app.route('/get_status', methods=['POST'])
def get_status():
    print('get status from eden')
    logging.info('get status from eden')
    
    job_id = request.form['task_id']
    results = client.fetch(token=job_id)
    status = results['status']
    print(results)
    logging.info(results)
    if status == 'complete':
        #img = results['output']['creation']
        #config = results['output']['config']
        #save_creation(img, config)
        pass
    result = {'status': status}
    return jsonify({}), 202, result


@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/create')
def create():
    return render_template('create.html')

@app.route('/scripture')
def scripture():
    return render_template('scripture.html')

@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(debug=True)
