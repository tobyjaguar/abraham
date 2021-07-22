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
client = Client(url = 'http://127.0.0.1:5656', username='abraham', timeout= 990000)


def modify_stats(request, action):
    idx = int(request.form['index'])
    stats_path = 'static/results/%04d/stats.json'%idx
    with open(stats_path) as f:
        stats = json.load(f)
    stats[action] = stats[action] + 1
    with open(stats_path, 'w') as outfile:
        json.dump(stats, outfile)
    return jsonify({}), 202, stats


@app.route('/praise', methods=['POST'])
def praise():
    return modify_stats(request, 'praise')


@app.route('/burn', methods=['POST'])
def burn():
    return modify_stats(request, 'burn')


@app.route('/get_creations', methods=['POST'])
def get_creations():
    sort_by = request.form['sort_by']
    creations = []
    results = glob.glob('static/results/*')
    for result in results:
        index = int(result.split('/')[-1])
        image_path = '{}/image.jpg'.format(result)
        config_path = '{}/config.json'.format(result)
        stats_path = '{}/stats.json'.format(result)
        if not os.path.isfile(config_path) or not os.path.isfile(image_path):
            continue
        with open(config_path) as f:
            config = json.load(f)
        with open(stats_path) as f:
           stats = json.load(f)
        text_input = config['text_inputs'][0]['text']
        praises, burns = stats['praise'], stats['burn']
        creation = {
            'index': index,
            'image': image_path, 
            'text_input': text_input, 
            'praise': praises,
            'burn': burns,
            'time': datetime.fromtimestamp(pathlib.Path(image_path).stat().st_mtime)
        }
        creations.append(creation)
    if sort_by == 'newest':
        creations = sorted(creations, key=lambda k: k['time'], reverse=True)
    elif sort_by == 'praise':
        creations = sorted(creations, key=lambda k: k['praise'], reverse=True)
    elif sort_by == 'burn':
        creations = sorted(creations, key=lambda k: k['burn'], reverse=True)
    return jsonify(creations)
    

def check_on_task(task_id):
    time.sleep(5)    
    response = client.await_results(task_id)
    if 'output' not in response:
        return    
    img = response['output']['creation']
    config = response['output']['config']
    stats = {'praise': 0, 'burn': 0}
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
    stats_path = '{}/{}'.format(output_dir, 'stats.json')
    if not os.path.isdir(output_dir):
        os.mkdir(output_dir)
    img.save(image_path)
    with open(config_path, 'w') as outfile:
       json.dump(config, outfile)
    with open(stats_path, 'w') as outfile:
       json.dump(stats, outfile)


def submit_token(token):
    if token == 'hello':
        return True
    else:
        return False


@app.route('/request_creation', methods=['POST'])
def request_creation():
    text_input = request.form['text_input']    
    token = request.form['token']
    success = submit_token(token)
    if success:
        config = {
            'model_name': 'imagenet', 
            'text_inputs': [{
                'text': text_input,
                'weight': 10.0
            }],
            'width': 512,
            'height': 512,
            'num_octaves': 3,
            'octave_scale': 2.0,
            'num_iterations': [20, 30, 40],
            'weight_decay': 0.1,
            'learning_rate': 0.1,
            'lr_decay_after': 400,
            'lr_decay_rate': 0.995
        }
        response = client.run(config)
        task_id = response['token']
        result = {'result': 'success', 'task_id': task_id}
        executor.submit(check_on_task, task_id)
    else:
        result = {'result': 'fail'}
    return jsonify({}), 202, result


@app.route('/get_status', methods=['POST'])
def get_status():
    task_id = request.form['task_id']
    try:
        results = client.fetch(token=task_id)
    except:
        logging.info('Error on client.fetch(token="{}")'.format(task_id))
        results = {'status': 'fetch_error'}
    if results['status'] == 'queued':
        # to-do: provide estimate of wait time
        #status_of_running_tasks = results['status_of_running_tasks']
        #queue_position = results['queue_position']
        #sec_per_job = 200/4.962 + 250/3.826 + 300/1.964
        #num_gpus = len(status_of_running_tasks)
        #sec_remaining_per_job = [(1.0-s) * sec_per_job for s in status_of_running_tasks]
        #results['estimated_wait_time'] = 0  # todo
        pass
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
