# Abraham


> And in the hearts of all who are skillful I have put skill.
> 
> Exodus 31:6

Abraham is a project to create an [autonomous artificial artist](https://abraham.ai/).

# Application

Installation:

    sudo apt-get install redis-server
    python3 -m venv abraham_env
    source abraham_env/bin/activate
    pip install -r requirements.txt

[Configure Redis](https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-redis-on-ubuntu-20-04), then [setup nginx and gunicorn](https://www.digitalocean.com/community/tutorials/how-to-serve-flask-applications-with-gunicorn-and-nginx-on-ubuntu-18-04).

Create a file called `.env` in the root folder which specifies the url of the generator client (`CLIENT_URL`) and a file to log to (`LOG_FILE`), e.g.

    CLIENT_URL=http://127.0.0.1:5000
    LOG_FILE=log.txt

Set up a systemd service to execute the start-up command `gunicorn --workers 1 --bind unix:abraham.sock -m 007 wsgi:app`, and run:

    sudo systemctl start abraham
