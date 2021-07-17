import os
import time
import json
import glob
import PIL
import random
import pathlib
import logging
from dotenv import load_dotenv
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, render_template, send_from_directory
from flask import session, flash, redirect, url_for, jsonify
from eden.client import Client
from eden.datatypes import Image


app = Flask(__name__)
app.config['SECRET_KEY'] = 'top-secret!'

# threading for checking on save
executor = ThreadPoolExecutor(4)

# setup logging
logging.basicConfig(filename='../abraham.log', 
                    filemode='a', 
                    level=logging.DEBUG,
                    datefmt='%H:%M:%S',
                    format='%(asctime)s,%(msecs)d %(name)s %(levelname)s %(message)s')

# text-to-image client
client = Client(url = 'http://127.0.0.1:5454', username='abraham', timeout= 990000)


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
    

def check_on_task(task_id):
    response = client.await_results(task_id)

    if 'output' not in response:
        return
    
    img = response['output']['creation']
    config = response['output']['config']

    load_dotenv()
    RESULTS_DIR = os.environ['RESULTS_DIR']  
    
    try:
        last_idx = int(sorted(glob.glob(f'{RESULTS_DIR}/*'))[-1].split('/')[-1])
    except:
        last_idx = 0
    idx = 1 + last_idx
    output_dir = f'{RESULTS_DIR}/%04d'%idx
    image_path = '{}/{}'.format(output_dir, 'image.jpg')
    config_path = '{}/{}'.format(output_dir, 'config.json')        

    if not os.path.isdir(output_dir):
        os.mkdir(output_dir)

    img.save(image_path)

    with open(config_path, 'w') as outfile:
       json.dump(config, outfile)
    

@app.route('/request_creation', methods=['POST'])
def request_creation():
    text_input = request.form['text_input']
    
    config = {
        'model_name': 'imagenet', #random.choice(['imagenet', 'wikiart']),
        'text_inputs': [{
            'text': text_input,
            'weight': 10.0
        }],
        'width': 512,
        'height': 512,
        'num_octaves': 3,
        'octave_scale': 2.0,
        'num_iterations': [200, 250, 300],
        'weight_decay': 0.1,
        'learning_rate': 0.1,
        'lr_decay_after': 400,
        'lr_decay_rate': 0.995
    }
    
    response = client.run(config)
    task_id = response['token']
    result = {'task_id': task_id}

    executor.submit(check_on_task, task_id)
    
    return jsonify({}), 202, result


@app.route('/get_status', methods=['POST'])
def get_status():
    job_id = request.form['task_id']
    results = client.fetch(token=job_id)
    if results['status'] == 'queued':
        # to-do: provide estimate of wait time
        status_of_running_tasks = results['status_of_running_tasks']
        queue_position = results['queue_position']
        sec_per_job = 200/4.962 + 250/3.826 + 300/1.964
        num_gpus = len(status_of_running_tasks)
        sec_remaining_per_job = [(1.0-s) * sec_per_job for s in status_of_running_tasks]
        results['estimated_wait_time'] = 0  # todo

    return jsonify({}), 202, results


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
