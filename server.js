const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const task = require('./models/task');
const comments = require('./models/comments');
const multer = require('multer');

const app = express()

const port = 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })
app.use('/uploads', express.static('uploads'))
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));
connectDB()

app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
  const todolist = await task.find().sort({ createdAt: -1 });
  res.render('layout/todolist', { todolist });
});

app.get('/addtask', async (req, res) => {
  res.render('layout/addTask')
})

app.post('/addtask', upload.single('taskImage'), async (req, res) => {
  try {
    const { title, discription, deadline, followup, status, priority, subtargets } = req.body

    let filename = ''

    if (req.file) {
      filename = req.file.filename
    }

    if (!title || !discription || !deadline || !followup || !status || !priority) {
      res.redirect('/addtask');
    }

    const subTargets = []

    subtargets.map((data) => {
      subTargets.push({
        value: data
      })
    })

    const newTask = new task({
      title,
      discription,
      deadline,
      followup,
      status,
      priority,
      filename,
      subTargets
    });

    await newTask.save();

    res.redirect('/');
  } catch (error) {
    console.log('Error', error)
  }

})


app.post('/deletetask/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) {
      console.log("Task ID required");
      return res.redirect('/');
    }

    await task.findByIdAndDelete(taskId);
    await comments.deleteMany({ taskId });

    console.log(`Task ${taskId} deleted`);
    res.redirect('/');

  } catch (error) {
    console.log('error', error)
  }
})

app.get('/taskDetail/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params
    if (!taskId) {
      return res.redirect('/')
    }

    const todoTask = await task.findById(taskId)
    const taskComments = await comments.find({ taskId })

    if (!todoTask) {
      console.log("No such task exit in the database")
      return res.redirect('/')
    }

    res.render('layout/todoDetail', { task: todoTask, comments: taskComments })
  } catch (error) {
    console.log('error', error)
  }

})

app.get('/edittaskpage/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) {
      return res.redirect('errorpage')
    }
    const todoTask = await task.findById(taskId)
    res.render('layout/EditTaskPage', { task: todoTask })
  } catch (error) {

  }
})

app.post('/editTask/:taskId', upload.single('taskImage'), async (req, res) => {
  try {
    const { taskId } = req.params

    const todoTask = await task.findById(taskId);

    if (!todoTask) {
      console.log("No such task exit in the database")
      return res.redirect('/')
    }

    const { title, discription, deadline, followup, status, priority, subtargets,completed } = req.body

    const subTargets = []
    subtargets.forEach((data,index) => {
    const isCompleted=  completed && completed.includes(String(index));
      subTargets.push({
        value: data,
        completed: isCompleted
      })
    })

    const editTask = {
      title,
      discription,
      deadline,
      followup,
      status,
      priority,
      subTargets
    }

    if (req.file) {
      editTask.filename = req.file.filename
    }
    await task.findByIdAndUpdate(taskId, { ...editTask });

    // const updatedTask = await task.findById(taskId);
    // const taskComments = await comments.find({ taskId })
    // res.render('layout/todoDetail', { task: updatedTask, comments: taskComments });
    res.redirect('/taskDetail/' + taskId)

  } catch (error) {
    console.log('error', error)
  }
});

app.post('/addComment/:taskId', upload.single('commentfile'), async (req, res) => {
  const { comment } = req.body;
  const { taskId } = req.params;

  if (!comment || !taskId) {
    console.log("Missing comment or task ID");
    return res.redirect('/taskDetail/' + taskId);
  }

  let commentfile = ''
  if (req.file) {
    commentfile = req.file.filename
  }

  try {
    const newComment = new comments({ comment, taskId, commentfile });
    await newComment.save();

    res.redirect('/taskDetail/' + taskId);


  } catch (error) {
    console.log("Error saving comment:", error);
    // res.redirect('/taskDetail/' + taskId);
  }
});


app.get('/commentfileShow/:commentId', async (req, res) => {
  const { commentId } = req.params

  console.log(commentId)
  if (!commentId) {
    return res.redirect('/errorpage')
  }


  const commentData = await comments.findById(commentId)
  console.log(commentData)
  res.render('layout/commentFile', { commentData })

})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});