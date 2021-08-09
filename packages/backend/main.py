import glob
import json
import sys
import os
from eden.client import Client
from eden.datatypes import Image

from dotenv import load_dotenv
load_dotenv()
CLIENT_URL = os.getenv('CLIENT_URL')

results_dir = '../react-app/public/results'

action = sys.argv[1]


def save_output(response):
  img = response['output']['creation']
  config = response['output']['config']
  stats = {'praise': 0, 'burn': 0}
  try:
    last_idx = int(sorted(glob.glob('{}/*'.format(results_dir)))[-1].split('/')[-1])
  except:
    last_idx = 0
  idx = 1 + last_idx
  output_dir = '%s/%04d'%(results_dir, idx)
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
  return idx
  #tokens.spend_token(token, idx)
  #logging.info('Task {} finished. Saved to {}'.format(task_id, output_dir))


if action == 'create':
  client = Client(url = CLIENT_URL, username='abraham', timeout= 990000, verify_ssl=False)
  text_input = sys.argv[2]
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
    'num_iterations': [7, 3, 2],
    'weight_decay': 0.1,
    'learning_rate': 0.1,
    'lr_decay_after': 400,
    'lr_decay_rate': 0.995
  }
  response = client.run(config)
  task_id = response['token']
  print(task_id)

elif action == 'fetch':
  client = Client(url = CLIENT_URL, username='abraham', timeout= 990000, verify_ssl=False)
  task_id = sys.argv[2]
  response = client.fetch(token=task_id)
  if 'progress' in response:
    response['progress'] = response['progress'] or 0
  if response['status'] == 'complete':
    idx = save_output(response)
    response['index'] = idx
    response['output'].pop('creation')
  print(json.dumps(response))