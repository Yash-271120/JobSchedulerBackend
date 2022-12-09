const express = require('express');
const amqp = require('amqplib');

const app = express();

//setting up the queue
var channel, connection;
(async () => {
    const queue = 'tasks';
    connection = await amqp.connect('amqp://localhost:5672');
    console.log("Connected to RabbitMQ....");
    channel = await connection.createChannel();
    console.log("Channel created....");
    await channel.assertQueue(queue);
    console.log("Queue created....");
  })();

app.use(express.json());  

app.get("/", (req, res) => {
    res.send("This is MAIL Service");
});

app.post('/mail/add-task/', (req, res) => {
    try {
       var task = {
            priority: req.body.priority,
            time_stamp: Date.now(),
            dependency: req.body.dependency
       } 
       if(task.priority>3 || task.priority<1) {
           res.status(400).send("Priority should be between 1 and 3");
           return;
        }
       var queue = 'tasks';
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(task)));
        res.send('Task added to queue');
    } catch (error) {
        res.status(500).send(error);
    }
});

app.listen(1111, () => {
    console.log("MAIL Service is running on port 1111");
});