import json
import random
import string


FILENAME = 'tokens.json'

def get_random_string(N):
    return ''.join(random.choice(string.ascii_uppercase + string.ascii_lowercase + string.digits) for _ in range(N))


def load_tokens():
    with open(FILENAME, 'r') as f:
        tokens = json.load(f)
    return tokens


def save_tokens(tokens):
    with open(FILENAME, 'w') as outfile:
        json.dump(tokens, outfile)


def add_new_tokens(n, note):
    new_tokens = []
    tokens = load_tokens()
    for i in range(n):
        rand_token = get_random_string(8)
        while rand_token in tokens:
            rand_token = get_random_string(8)
        tokens[rand_token] = {'creation': None, 'note': note}
        new_tokens.append(rand_token)
    print("%d new tokens created\n=================".format(n))
    save_tokens(tokens)
    for t in new_tokens:
        print(t)
    return new_tokens


def authenticate(token):
    tokens = load_tokens()
    if token in tokens:
        creation = tokens[token]['creation']
        if creation:
            return 'spent'
        else:
            return 'unspent'
    else:
        return 'none'


def spend_token(token, task_id):
    tokens = load_tokens()
    if token not in tokens:
        print('token {} not found'.format(token))
        return
    tokens[token]['creation'] = task_id
    save_tokens(tokens)


if __name__ == '__main__':
    main()