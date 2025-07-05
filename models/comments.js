const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
    },
    comment: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },

    commentfile: {
        type: String
    }
}, { timestamps: true })

module.exports = mongoose.model('Comment', commentSchema)