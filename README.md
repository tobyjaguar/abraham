# Abraham

> And in the hearts of all who are skillful I have put skill.
> 
> Exodus 31:6

Abraham is a project to create an [autonomous artificial artist](https://abraham.ai/). This repository is the main front-end application which connects to the [generator](https://github.com/abraham-ai/eden-clip).

It is a modified version of the [sign-in-with-web3 branch of scaffold-eth 🏗](https://github.com/austintgriffith/scaffold-eth/tree/sign-in-with-web3). This is a work-in-progress and doesn't function properly yet.

# Application

Installation:

    yarn install

Create a file called `.env` in the root folder which specifies the url of the generator client (`CLIENT_URL`) and a file to log to (`LOG_FILE`), e.g.

    CLIENT_URL=http://127.0.0.1:5000
    LOG_FILE=log.txt
    
To launch the app and the backend service:

    yarn start
    yarn backend

