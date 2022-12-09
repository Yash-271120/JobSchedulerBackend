const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    priority: {
        type: Number,
        required: true
    },
    time_stamp: {
        type: Date,
        required: false,
        default: Date.now()
    },
    dependency: {
        task:{
            type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: false
        }
        
    }

});

module.exports = mongoose.model('Task', taskSchema);