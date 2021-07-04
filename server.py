import os
import time
import json
import glob
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
app.secret_key = 'your_secret_key_here'

# setup logging
logging.basicConfig(filename='abraham2.log', 
                    filemode='a', 
                    level=logging.DEBUG,
                    datefmt='%H:%M:%S',
                    format='%(asctime)s,%(msecs)d %(name)s %(levelname)s %(message)s')

# text-to-image client
client = Client(url = 'http://127.0.0.1:5656', username='abraham', timeout= 990000)
setup_response = client.setup()


@app.route('/get_images', methods=['GET'])
def get_images():
    creations = []
    results = glob.glob('static/results/*')
    for result in results:
        image_path = '{}/image.jpg'.format(result)
        config_path = '{}/config.json'.format(result)
        if not os.path.isfile(config_path) or not os.path.isfile(image_path):
            continue
        with open(config_path) as f:
            config = json.load(f)
            
        # quick hack because of backdated images with different config schema
        if 'text_inputs' in config:
            text_input = config['text_inputs'][0]['text']
        elif 'prompt' in config:
            text_input = config['prompt']
        else:
            text_input = '___UNDEFINED!!!___'
            
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
        'prompt': text_input,
        'width': 512,
        'height': 512,
        'iters': 1100,
        'weight_decay': 0.1,
        'learning_rate': 0.1,
        'lr_decay_after': 400,
        'lr_decay_rate': 0.995
    }
    response = client.run(config)

    print(response)
    #pil_image = run_response['output']['creation']
    #pil_image.save('_hi_saved_from_server.png')
    logging.info(response)

    task_id = response['token']

    result = {'task_id': task_id}
    
    return jsonify({}), 202, result

@app.route('/get_status', methods=['POST'])
def get_status():
    job_id = request.form['task_id']
    status = 'done'
    
    results = client.fetch(token=job_id)
    print(results)
    logging.info(results)
    status = results['status']
    
    result = {'status': status}
    return jsonify({}), 202, result

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

# @app.route('/create')
# def create():
#     return render_template('create.html')
@app.route('/create', methods=['GET', 'POST'])
def create():
    if request.method == 'GET':
        return render_template('create.html')

@app.route('/test')
def test2():
    return render_template('create.html')

@app.route('/scripture')
def scripture():
    return render_template('scripture.html')

@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(debug=True)
