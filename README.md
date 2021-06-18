# Abraham


> And in the hearts of all who are skillful I have put skill.
> 
> Exodus 31:6

Abraham is a project to create an [autonomous artificial artist](https://abraham.ai/).

# Application

Server task queue based on https://github.com/miguelgrinberg/flask-celery-example

Installation:

    sudo apt get install redis-server
    pip install -r requirements.txt

[Install nginx and gunicorn](https://www.digitalocean.com/community/tutorials/how-to-serve-flask-applications-with-gunicorn-and-nginx-on-ubuntu-18-04), set up a systemd service to execute the start-up command `gunicorn --workers 1 --bind unix:abraham.sock -m 007 wsgi:app`, and run:

    sudo systemctl start abraham

Also, to launch workers, run:

    redis-server
    celery -A server.celery worker  -P solo -l info --logfile=log_celery.txt 

To stop celery workers:
    
    ps auxww | grep 'server.celery worker' | awk '{print $2}' | xargs kill -9
    

