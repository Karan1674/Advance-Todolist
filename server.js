const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const task = require('./models/task');
const comments = require('./models/comments');
const multer = require('multer');
const user = require('./models/user');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express()
dotenv.config()
const port = 3000;

app.use(cookieParser())

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

const isAuthenicated = async (req, res, next) => {
  try {
    const token = req.cookies.token

    if (!token) {
      return res.redirect('/loginPage')
    }
    const decode = jwt.verify(token, process.env.SECRET_KEY);

    if (!decode) {
      return res.redirect('/loginPage')
    }

    req.id = decode.userId;
    next();
  } catch (error) {
    console.log(error)
  }
}

app.get('/', isAuthenicated, async (req, res) => {
  const userId = req.id;


  if (userId) {
    const userData = await user.findById(userId)
    if (userData) {
      return res.render('layout/Home.ejs', { user: userData });
    }
    else {
      return res.redirect('/loginPage');
    }
  }
  return res.render('layout/Home.ejs', { user: null });
})

app.get('/signupPage', async (req, res) => {
  const token = req.cookies.token

  if (!token) {
    return res.render('layout/SignUp.ejs');
  }
  else {
    return res.redirect('/task')
  }
})

app.post('/userSignUp', upload.single('profilePic'), async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    console.log(firstName, lastName, email, password)

    const profilePic = req.file

    if (!firstName || !lastName || !email || !password || !profilePic) {
      return res.redirect('/signupPage')
    }

    const userExist = await user.findOne({ email });

    if (userExist) {
      return res.redirect('/signupPage')
    }

    const hashPassword = await bcrypt.hash(password, 10);

    await user.create({
      firstName,
      lastName,
      email,
      password: hashPassword,
      profilePic: profilePic.filename

    })
    return res.redirect('/loginPage')
  } catch (error) {
    console.log(error)
  }
})


app.get('/loginPage', async (req, res) => {
  const token = req.cookies.token

  if (!token) {
    return res.render('layout/Login');
  }
  else {
    return res.redirect('/')
  }
})

app.post('/userlogin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.redirect('/loginPage')
    }

    const userData = await user.findOne({ email })

    const isPasswordMatch = await bcrypt.compare(password, userData.password);

    if (!isPasswordMatch) {
      return res.redirect('/loginPage')
    }

    const tokenData = {
      userId: userData._id
    }

    const token = jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: "1d" });


    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    })

    res.redirect('/')


  } catch (error) {
    console.log(error)
  }
})

app.get('/logout', isAuthenicated, (req, res) => {
  try {
    res.clearCookie('token')
    res.redirect('/loginPage')
  } catch (error) {
    console.log('error', error)
  }
})

app.get('/task', isAuthenicated, async (req, res) => {
  try {
    const userId = req.id;
    const todolist = await task.find({ userId }).sort({ createdAt: -1 });
    const userData = await user.findById(userId)
    if (userData && userData.email == process.env.AdminEmail) {
      return res.render('layout/todolist.ejs', { todolist, user: userData, isAdmin: true })
    }
    else if (userData) {
      return res.render('layout/todolist.ejs', { todolist, user: userData, isAdmin: false })
    }
    else {
      return res.redirect('/loginPage');
    }
  } catch (error) {

  }
});

app.get('/addtask', isAuthenicated, async (req, res) => {
  try {
    const userId = req.id
    const userData = await user.findById(userId)
    const allUsers = await user.find()
    if (userData && userData.email == process.env.AdminEmail) {
      return res.render('layout/addTask', { user: userData, isAdmin: true, allUsers })
    }
    else if (userData) {
      res.render('layout/addTask', { user: userData })
    }
    else {
      return res.redirect('/loginPage')
    }
  } catch (error) {

  }
})

app.post('/addtask', isAuthenicated, upload.single('taskImage'), async (req, res) => {
  try {
    const userId = req.id
    const { title, discription, deadline, followup, status, priority, subtargets, assignedTo } = req.body

    let filename = ''

    if (req.file) {
      filename = req.file.filename
    }

    if (!userId || !title || !discription || !deadline || !followup || !status || !priority) {
      res.redirect('/addtask');
    }

    const subTargets = []

    subtargets && subtargets.map((data) => {
      subTargets.push({
        value: data
      })
    })

    const userData = await user.findById(userId);
    const finalUser =
      userData.email === process.env.AdminEmail && assignedTo
        ? assignedTo
        : userId;

    const newTask = new task({
      userId: finalUser,
      title,
      discription,
      deadline,
      followup,
      status,
      priority,
      filename,
      subTargets,
      assignedBy: userData.email === process.env.AdminEmail && assignedTo !== userId ? "admin" : ''
    });

    await newTask.save();

    res.redirect('/task');
  } catch (error) {
    console.log('Error', error)
  }
})


app.post('/deletetask/:taskId', isAuthenicated, async (req, res) => {
  try {


    const { taskId } = req.params;
    if (!taskId) {
      console.log("Task ID required");
      return res.redirect('/');
    }


    await task.findByIdAndDelete(taskId);
    await comments.deleteMany({ taskId });

    console.log(`Task ${taskId} deleted`);
    res.redirect('/task');

  } catch (error) {
    console.log('error', error)
  }
})

app.get('/taskDetail/:taskId', isAuthenicated, async (req, res) => {
  try {
    const userId = req.id

    const { taskId } = req.params
    if (!taskId) {
      return res.redirect('/task')
    }

    const userData = await user.findById(userId);
    const todoTask = await task.findById(taskId)
    const taskComments = await comments.find({ taskId })

    if (!todoTask) {
      console.log("No such task exit in the database")
      return res.redirect('/task')
    }

    res.render('layout/todoDetail', { task: todoTask, comments: taskComments, user: userData })
  } catch (error) {
    console.log('error', error)
  }

})

app.get('/edittaskpage/:taskId', isAuthenicated, async (req, res) => {
  try {
    const userId = req.id;
    const { taskId } = req.params;
    if (!taskId) {
      return res.redirect('errorpage')
    }

    const userData = await user.findById(userId);
    const todoTask = await task.findById(taskId)
    res.render('layout/EditTaskPage', { task: todoTask, user: userData })
  } catch (error) {

  }
})

app.post('/editTask/:taskId', isAuthenicated, upload.single('taskImage'), async (req, res) => {
  try {
    const { taskId } = req.params

    const todoTask = await task.findById(taskId);

    if (!todoTask) {
      console.log("No such task exit in the database")
      return res.redirect('/')
    }

    const { title, discription, deadline, followup, status, priority, subtargets, completed } = req.body

    const subTargets = []
    subtargets.forEach((data, index) => {
      const isCompleted = completed && completed.includes(String(index));
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

app.post('/addComment/:taskId', isAuthenicated, upload.single('commentfile'), async (req, res) => {
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


app.get('/commentfileShow/:commentId', isAuthenicated, async (req, res) => {
  const { commentId } = req.params
  const userId = req.id

  if (!commentId) {
    return res.redirect('/errorpage')
  }

  const userData = await user.findById(userId)
  const commentData = await comments.findById(commentId)
  res.render('layout/commentFile', { commentData, user: userData })

})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});