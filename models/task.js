const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    title: {
        type: String,
        required: true
    },
    discription: {
        type: String,
        required: true
    },
    deadline: {
        type: Date,
        required: true
    },
    priority: {
        type: String,
        required: true,
        enum: ['Critical', 'High', 'Low', 'Medium'],
        default: 'Critical'
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'in-process'],
        default: 'pending'
    },
    followup: {
        type: Date,
        default: Date.now,
        required: true
    },
    filename: {
        type: String,
    },
    subTargets: [
        {
            value: { type: String },
            completed: { type: Boolean, default: false }
        }
    ],
    assignedBy:{
        type:String
    }

}, { timestamps: true })


module.exports = mongoose.model('Task', taskSchema)