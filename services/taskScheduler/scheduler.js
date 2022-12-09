const express = require('express');
const amqp = require('amqplib');
const mongoose = require('mongoose');
const Task = require('./task');
const redis = require('redis');

const app = express();
const redisurl = 'redis://127.0.0.1:6379';

//connect to redis
const redisClient = redis.createClient(redisurl);
redisClient.connect().then(() => {
    console.log("Connected to Redis");
});

//connect to mongodb
mongoose.connect('mongodb://localhost:2717/task_schedular', {useNewUrlParser: true, useUnifiedTopology: true},()=>{
    console.log("Connected to MongoDB");
})

//setting up the queue
var channel, connection;
var mediumStartIndex = 0, mediumEndIndex = 0;
(async () => {
    const queue = 'tasks';
    connection = await amqp.connect('amqp://localhost:5672');
    console.log("Connected to RabbitMQ....");
    channel = await connection.createChannel();
    console.log("Channel created....");
    await channel.assertQueue(queue);
    console.log("Queue created....");
    channel.consume('tasks',async (msg) => {
        if(msg){
            channel.ack(msg);
            console.log("Message received: ", JSON.parse(msg.content.toString()));
            var task = JSON.parse(msg.content.toString());
            var newTask = new Task(task);
            for(let i=0; i<newTask.dependency.length; i++) {
                newTask.dependency[i].task = mongoose.Types.ObjectId(newTask.dependency[i].task);
            }
            try {
                const response = await newTask.save();
                console.log("Task saved: ", newTask);
                let data = await redisClient.lRange('queue',0,-1);
                
                if(data.length>0) {
                    console.log("Cache Hit");
                    if(newTask.dependency.task){
                        for(let i = 0;i<data.length;i++){
                            let task = JSON.parse(data[i]);
                            if(task._id==newTask.dependency.task) {
                                if(newTask.priority==1) {
                                    if(i==data.length-1){
                                        redisClient.rPush('queue',JSON.stringify(newTask));
                                    }else{
                                        data.splice(i+1,0,JSON.stringify(newTask));
                                        redisClient.del('queue');
                                        redisClient.rPush('queue',data);
                                        (i+1>mediumStartIndex && i+1<=mediumEndIndex)?mediumEndIndex++:mediumEndIndex;
                                        if(i+1<=mediumStartIndex){
                                            mediumStartIndex++;
                                            mediumEndIndex++;
                                        }
                                    }
                                }else if(newTask.priority==2) {
                                    if(i==data.length-1){
                                        redisClient.rPush('queue',JSON.stringify(newTask));
                                    }else{
                                        if(i+1<=mediumStartIndex){
                                            data.splice(mediumStartIndex,0,JSON.stringify(newTask));
                                            mediumEndIndex++;
                                            
                                        }else if(i+1>mediumStartIndex && i+1<=mediumEndIndex){
                                            data.splice(i+1,0,JSON.stringify(newTask));
                                            mediumEndIndex++;
                                        }else{
                                            data.splice(i+1,0,JSON.stringify(newTask));
                                        }
                                        redisClient.del('queue');
                                        redisClient.rPush('queue',data);                                   
                                    }
                                }else if(newTask.priority==3) {
                                    redisClient.rPush('queue',JSON.stringify(newTask));
                                }
                            }
                        }
                    }else{
                        if(newTask.priority==1) {
                            redisClient.lPush('queue',JSON.stringify(newTask));
                            mediumStartIndex++;
                            mediumEndIndex++;
                        }else if(newTask.priority==2) {
                            data.splice(mediumStartIndex,0,JSON.stringify(newTask));
                            console.log("Data: ", data);
                            mediumEndIndex++;
                            redisClient.del('queue');
                            redisClient.rPush('queue',data);
                        }else if(newTask.priority==3) {
                            redisClient.rPush('queue',JSON.stringify(newTask));
                        }
                    }
                }else {
                    console.log("Cache Miss");
                    if(newTask.priority==1) {
                        redisClient.lPush('queue',JSON.stringify(newTask));
                        mediumStartIndex++;
                        mediumEndIndex++;
                    }else if(newTask.priority==2) {
                        redisClient.lPush('queue',JSON.stringify(newTask));
                        mediumEndIndex++;
                    }else if(newTask.priority==3) {
                        redisClient.rPush('queue',JSON.stringify(newTask));
                    }
                }
            } catch (error) {
                console.log("Error: ", error);
            }   
        }else{
            console.log("No message received");
        }
    });
  })();




app.use(express.json());

app.get("/", (req, res) => {
    res.send("This is Task scheduler Service");
});

app.get("/tasks", async (req, res) => {
    var schedule = await redisClient.lRange('queue',0,-1);
    console.log("yash",schedule);
    if(schedule.length>0) {
        for(let i=0;i<schedule.length;i++){
            schedule[i] = JSON.parse(schedule[i]);
        }
    res.send(schedule);
    }else{
        res.send("No tasks to scheduled");
    }
});

app.listen(3333, () => {
    console.log("Task Scheduler Service is running on port 3333");
});