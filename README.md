# JobSchedulerBackend
A microservice based backend to schedule jobs based on their priority.


_The workflow_
![Web app](https://ibb.co/KF4pvz0)

***
## Things required to run
1. nodeJS
2. Docker
3. npm package manager

***
## To re-create the Backend

#### Running Images using docker

1. run RabbitMQ using the command `docker run -it --rm --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.11-management`
2. run Redis using the command `docker run --name rdb -p 6379:6379 redis`
3. run mongo using the command `docker run --name mymongo -p 2717:27017 mongo` you can use mongodb compass to watch the db in GUI.
4. install node packages using `npm install` in every services.
5. run the services using `node ${service}`.