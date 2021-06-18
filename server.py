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
from celery import Celery
from celery.utils.log import get_task_logger

import generator


app = Flask(__name__)
app.config['SECRET_KEY'] = 'top-secret!'

# Celery configuration
app.config['CELERY_BROKER_URL'] = 'redis://localhost:6379/0'
app.config['CELERY_RESULT_BACKEND'] = 'redis://localhost:6379/0'

# Initialize Celery
celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)

# Setup logging
logger = get_task_logger(__name__)
logger.level = logging.DEBUG


@celery.task(bind=True)
def creation(self, text_input):
    last_idx = int(sorted(glob.glob('static/results/*'))[-1].split('/')[-1])
    idx = 1 + last_idx
    output_dir = 'static/results/%04d'%idx

    image_path = '{}/{}'.format(output_dir, 'image.jpg')
    config_path = '{}/{}'.format(output_dir, 'config.json')        

    config = {
        'text_inputs': [{
            'text': text_input, 
            'weight': 10.0
        }],
        'size': (512, 512),
        'num_iterations': 1000,
        'batch_size': 1,
        'cutn': 24,
        'weight_decay': 0.1,
        'learning_rate': 0.1,
        'lr_decay_after': 400,
        'lr_decay_rate': 0.995
    }

    if not os.path.isdir(output_dir):
        os.mkdir(output_dir)

    with open(config_path, 'w') as outfile:
        json.dump(config, outfile)
        
    def callback(results):
        #status = 'done' if results['iteration'] == results['num_iterations'] else 'generating'
        #status = '%s %d %d'%(status, results['iteration'], results['num_iterations'])
        output = {
            'current': results['iteration'], 
            'total': results['num_iterations']
        }
        self.update_state(state='PROGRESS', meta=output)
    
    img = generator.run(config, callback)
    img.save(image_path)
    
    results = {
        'current': config['num_iterations'], 
        'total': config['num_iterations'], 
        'result': image_path
    }
    
    return results


@app.route('/getjobs', methods=['GET'])
def getjobs():
    logging.info('get jobs')
    inspect = celery.control.inspect()
    num_scheduled = len(inspect.scheduled()['celery@G3000'])
    num_active = len(inspect.active()['celery@G3000'])
    num_reserved = len(inspect.reserved()['celery@G3000'])
    jobs = {'scheduled': num_scheduled, 
            'active': num_active, 
            'reserved': num_reserved}
    logging.info(jobs)
    return jsonify(jobs)


@app.route('/getimages', methods=['GET'])
def getimages():
    creations = []
    results = glob.glob('static/results/*')
    for result in results:
        image_path = '{}/image.jpg'.format(result)
        config_path = '{}/config.json'.format(result)
        if not os.path.isfile(config_path) or not os.path.isfile(image_path):
            continue
        with open(config_path) as f:
            config = json.load(f)
        creation = {
            'image': image_path, 
            'text_input': config['text_inputs'][0]['text'], 
            'time': datetime.fromtimestamp(pathlib.Path(image_path).stat().st_mtime)
        }
        creations.append(creation)
    creations = sorted(creations, key=lambda k: k['time'], reverse=True)
    return jsonify(creations)
    


@app.route('/start_creation', methods=['POST'])
def start_creation():
    text_input = request.form['text_input']
    task = creation.apply_async(args=[text_input])
    return jsonify({}), 202, {
        'Location': url_for('taskstatus', task_id=task.id)
    }


@app.route('/status/<task_id>')
def taskstatus(task_id):
    task = creation.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'current': 0,
            'total': 1,
            'status': 'Pending...'
        }
    elif task.state != 'FAILURE':
        response = {
            'state': task.state,
            'current': task.info.get('current', 0),
            'total': task.info.get('total', 1),
            'status': task.info.get('status', '')
        }
        if 'result' in task.info:
            response['result'] = task.info['result']
    else:
        response = {
            'state': task.state,
            'current': 1,
            'total': 1,
            'status': str(task.info),  # this is the exception raised
        }
    return jsonify(response)


@app.route('/<path:path>')
def send_js(path):
    return send_from_directory('static', path)


@app.route('/create', methods=['GET', 'POST'])
def create():
    if request.method == 'GET':
        return render_template('create.html')

@app.route('/scripture')
def scripture():
    return render_template('scripture.html')

@app.route('/')
def index():
    return render_template('index.html')




if __name__ == '__main__':
    app.run(debug=True)
