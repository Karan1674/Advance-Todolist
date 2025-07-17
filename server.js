const express = require("express");
const connectDB = require("./config/db");
const path = require("path");
const task = require("./models/task");
const comments = require("./models/comments");
const multer = require("multer");
const user = require("./models/user");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const mediaLibrary = require("./models/mediaLibrary");
const userStoragelimit = require("./models/userStoragelimit");
const puppeteer = require("puppeteer");
const fs = require("fs");
const ejs = require("ejs");


const app = express();
dotenv.config();
const port = 3000;

app.use(cookieParser());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });
app.use("/uploads", express.static("uploads"));
app.use("/public", express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/task-reports", express.static(path.join("task-reports")));

connectDB();

app.use(express.urlencoded({ extended: true }));

const isAuthenicated = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.render("layout/Home.ejs", { user: null, isAdmin: false });
    }
    const decode = jwt.verify(token, process.env.SECRET_KEY);

    if (!decode) {
      return res.render("layout/Home.ejs", { user: null, isAdmin: false });
    }

    req.id = decode.userId;
    next();
  } catch (error) {
    console.log(error);
  }
};

const isAdminCheck = async (req, res, next) => {
  const userId = req.id;
  if (userId) {
    const userData = await user.findById(userId);
    if (userData && userData.email == process.env.AdminEmail) {
      req.isAdmin = true;
    } else {
      req.isAdmin = false;
    }
  } else {
    req.isAdmin = false;
  }
  next();
};

app.get("/", isAuthenicated, isAdminCheck, async (req, res) => {
  const userId = req.id;

  const isAdmin = req.isAdmin;
  if (userId) {
    const userData = await user.findById(userId);
    if (userData) {
      return res.render("layout/Home.ejs", { user: userData, isAdmin });
    } else {
      return res.redirect("/loginPage");
    }
  }
  return res.render("layout/Home.ejs", { user: null, isAdmin: false });
});

app.get("/signupPage", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.render("layout/SignUp.ejs");
  } else {
    return res.redirect("/task");
  }
});

app.post("/userSignUp", upload.single("profilePic"), async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const profilePic = req.file;

    if (!firstName || !lastName || !email || !password || !profilePic) {
      return res.redirect("/signupPage");
    }

    const userExist = await user.findOne({ email });

    if (userExist) {
      return res.redirect("/signupPage");
    }

    const hashPassword = await bcrypt.hash(password, 10);

    await user.create({
      firstName,
      lastName,
      email,
      password: hashPassword,
      profilePic: profilePic.filename,
    });
    return res.redirect("/loginPage");
  } catch (error) {
    console.log(error);
  }
});

app.get("/loginPage", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.render("layout/Login");
  } else {
    return res.redirect("/");
  }
});

app.post("/userlogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.redirect("/loginPage");
    }

    const userData = await user.findOne({ email });

    const isPasswordMatch = await bcrypt.compare(password, userData.password);

    if (!isPasswordMatch) {
      return res.redirect("/loginPage");
    }

    const tokenData = {
      userId: userData._id,
    };

    const token = jwt.sign(tokenData, process.env.SECRET_KEY, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
});

app.get("/logout", isAuthenicated, (req, res) => {
  try {
    res.clearCookie("token");
    return res.render("layout/Home.ejs", { user: null, isAdmin: false });
  } catch (error) {
    console.log("error", error);
  }
});

app.get("/task", isAuthenicated, isAdminCheck, async (req, res) => {
  try {
    const userId = req.id;
    const isAdmin = req.isAdmin;
    const todo = await task.find({ userId }).sort({ createdAt: -1 });
    const todolist = todo.filter((t) => t.assignedBy !== "admin");
    const userData = await user.findById(userId);
    if (userData && isAdmin) {
      return res.render("layout/todolist.ejs", {
        todolist,
        user: userData,
        isAdmin,
        isShow: true,
      });
    } else if (userData) {
      return res.render("layout/todolist.ejs", {
        todolist,
        user: userData,
        isAdmin,
        isShow: true,
      });
    } else {
      return res.redirect("/loginPage");
    }
  } catch (error) {
    console.log(error);
  }
});

app.get("/addtask", isAuthenicated, isAdminCheck, async (req, res) => {
  try {
    const userId = req.id;
    const isAdmin = req.isAdmin;
    const userData = await user.findById(userId);
    const media = await mediaLibrary.findOne({ userId });

    if (userData) {
      res.render("layout/addTask", { user: userData, isAdmin, media });
    } else {
      return res.redirect("/loginPage");
    }
  } catch (error) {
    console.log("error", error);
  }
});

app.get("/assigntask", isAuthenicated, isAdminCheck, async (req, res) => {
  try {
    const userId = req.id;
    const isAdmin = req.isAdmin;
    const userData = await user.findById(userId);
    const Users = await user.find();
    const allUsers = Users.filter((u) => u.email !== process.env.AdminEmail);
    const media = await mediaLibrary.findOne({ userId });
    if (userData) {
      res.render("layout/assignTask", {
        user: userData,
        isAdmin,
        allUsers,
        media,
      });
    } else {
      return res.redirect("/loginPage");
    }
  } catch (error) {
    console.log("error", error);
  }
});

app.post(
  "/addtask",
  isAuthenicated,
  upload.single("taskImage"),
  async (req, res) => {
    try {
      const userId = req.id;
      const {
        title,
        discription,
        deadline,
        followup,
        status,
        priority,
        subtargets,
      } = req.body;

      console.log(discription);
      let filename = "";

      if (req.file) {
        filename = req.file.filename;
      }

      if (
        !userId ||
        !title ||
        !discription ||
        !deadline ||
        !followup ||
        !status ||
        !priority
      ) {
        res.redirect("/addtask");
      }

      const subTargets = [];

      subtargets &&
        subtargets.map((data) => {
          subTargets.push({
            value: data,
          });
        });

      const newTask = new task({
        userId,
        title,
        discription,
        deadline,
        followup,
        status,
        priority,
        filename,
        subTargets,
        assignedBy: "",
      });

      await newTask.save();

      res.redirect("/task");
    } catch (error) {
      console.log("Error", error);
    }
  }
);

app.post(
  "/assigntask",
  isAuthenicated,
  isAdminCheck,
  upload.single("taskImage"),
  async (req, res) => {
    try {
      const userId = req.id;
      const {
        title,
        discription,
        deadline,
        followup,
        status,
        priority,
        subtargets,
        assignedTo,
      } = req.body;

      let filename = "";

      if (req.file) {
        filename = req.file.filename;
      }

      if (
        !userId ||
        !title ||
        !discription ||
        !deadline ||
        !followup ||
        !status ||
        !priority ||
        !assignedTo
      ) {
        res.redirect("/assigntask");
      }

      const subTargets = [];

      subtargets &&
        subtargets.map((data) => {
          subTargets.push({
            value: data,
          });
        });

      const newTask = new task({
        userId: assignedTo,
        title,
        discription,
        deadline,
        followup,
        status,
        priority,
        filename,
        subTargets,
        assignedBy: "admin",
      });

      await newTask.save();

      res.redirect("/assignedtask");
    } catch (error) {
      console.log("Error", error);
    }
  }
);

// app.get("/back", isAuthenicated, async (req, res) => {
//   res.redirect("back");
// });

app.post(
  "/deletetask/:taskId",
  isAuthenicated,
  isAdminCheck,
  async (req, res) => {
    try {
      const { taskId } = req.params;
      const isAdmin = req.isAdmin;
      if (!taskId) {
        console.log("Task ID required");
        return res.redirect("/");
      }

      await task.findByIdAndDelete(taskId);
      await comments.deleteMany({ taskId });

      console.log(`Task ${taskId} deleted`);
      if (isAdmin) {
        res.redirect("/assignedtask");
      } else {
        res.redirect("/task");
      }
    } catch (error) {
      console.log("error", error);
    }
  }
);

app.get(
  "/taskDetail/:taskId",
  isAuthenicated,
  isAdminCheck,
  async (req, res) => {
    try {
      const userId = req.id;
      const isAdmin = req.isAdmin;
      const { taskId } = req.params;
      if (!taskId) {
        return res.redirect("/task");
      }

      const userData = await user.findById(userId);
      const todoTask = await task.findById(taskId);
      const taskComments = await comments.find({ taskId });
      let isShow = false;

      if (!todoTask) {
        console.log("No such task exit in the database");
        return res.redirect("/task");
      }

      if (isAdmin) {
        isShow = true;
      } else if (todoTask.assignedBy == "admin") {
        isShow = false;
      } else {
        isShow = true;
      }

      res.render("layout/todoDetail", {
        task: todoTask,
        comments: taskComments,
        user: userData,
        isAdmin,
        isShow,
      });
    } catch (error) {
      console.log("error", error);
    }
  }
);

app.get(
  "/edittaskpage/:taskId",
  isAuthenicated,
  isAdminCheck,
  async (req, res) => {
    try {
      const userId = req.id;
      const isAdmin = req.isAdmin;
      const { taskId } = req.params;
      if (!taskId) {
        return res.redirect("errorpage");
      }

      const userData = await user.findById(userId);
      const todoTask = await task.findById(taskId);
      res.render("layout/EditTaskPage", {
        task: todoTask,
        user: userData,
        isAdmin,
      });
    } catch (error) {}
  }
);

app.post(
  "/editTask/:taskId",
  isAuthenicated,
  upload.single("taskImage"),
  async (req, res) => {
    try {
      const { taskId } = req.params;

      const todoTask = await task.findById(taskId);

      if (!todoTask) {
        console.log("No such task exit in the database");
        return res.redirect("/");
      }

      const {
        title,
        discription,
        deadline,
        followup,
        status,
        priority,
        subtargets,
        completed,
      } = req.body;

      const subTargets = [];
      subtargets &&
        subtargets.forEach((data, index) => {
          const isCompleted = completed && completed.includes(String(index));
          subTargets.push({
            value: data,
            completed: isCompleted,
          });
        });

      const editTask = {
        title,
        discription,
        deadline,
        followup,
        status,
        priority,
        subTargets,
      };

      if (req.file) {
        editTask.filename = req.file.filename;
      }
      await task.findByIdAndUpdate(taskId, { ...editTask });

      // const updatedTask = await task.findById(taskId);
      // const taskComments = await comments.find({ taskId })
      // res.render('layout/todoDetail', { task: updatedTask, comments: taskComments });
      res.redirect("/taskDetail/" + taskId);
    } catch (error) {
      console.log("error", error);
    }
  }
);

app.get(
  "/editAdminpage/:taskId",
  isAuthenicated,
  isAdminCheck,
  async (req, res) => {
    try {
      const userId = req.id;
      const isAdmin = req.isAdmin;
      const { taskId } = req.params;
      if (!taskId) {
        return res.redirect("errorpage");
      }

      const userData = await user.findById(userId);
      const todoTask = await task.findById(taskId);
      const Users = await user.find();
      const allUsers = Users.filter((u) => u.email !== process.env.AdminEmail);

      res.render("layout/EditAdminPage", {
        task: todoTask,
        user: userData,
        isAdmin,
        allUsers,
      });
    } catch (error) {}
  }
);

app.post(
  "/editAdminTask/:taskId",
  isAuthenicated,
  isAdminCheck,
  upload.single("taskImage"),
  async (req, res) => {
    try {
      const { taskId } = req.params;

      const todoTask = await task.findById(taskId);

      if (!todoTask) {
        console.log("No such task exit in the database");
        return res.redirect("/");
      }

      const {
        title,
        discription,
        deadline,
        followup,
        status,
        priority,
        subtargets,
        completed,
        assignedTo,
      } = req.body;

      const subTargets = [];
      subtargets &&
        subtargets.forEach((data, index) => {
          const isCompleted = completed && completed.includes(String(index));
          subTargets.push({
            value: data,
            completed: isCompleted,
          });
        });

      const editTask = {
        userId: assignedTo,
        title,
        discription,
        deadline,
        followup,
        status,
        priority,
        subTargets,
      };

      if (req.file) {
        editTask.filename = req.file.filename;
      }
      await task.findByIdAndUpdate(taskId, { ...editTask });

      res.redirect("/assignedtask");
    } catch (error) {
      console.log("error", error);
    }
  }
);

app.post(
  "/addComment/:taskId",
  isAuthenicated,
  upload.single("commentfile"),
  async (req, res) => {
    const { comment } = req.body;
    const { taskId } = req.params;

    if (!comment || !taskId) {
      console.log("Missing comment or task ID");
      return res.redirect("/taskDetail/" + taskId);
    }

    let commentfile = "";
    if (req.file) {
      commentfile = req.file.filename;
    }

    try {
      const newComment = new comments({ comment, taskId, commentfile });
      await newComment.save();

      res.redirect("/taskDetail/" + taskId);
    } catch (error) {
      console.log("Error saving comment:", error);
      // res.redirect('/taskDetail/' + taskId);
    }
  }
);

app.get(
  "/commentfileShow/:commentId",
  isAuthenicated,
  isAdminCheck,
  async (req, res) => {
    const { commentId } = req.params;
    const userId = req.id;
    const isAdmin = req.isAdmin;
    if (!commentId) {
      return res.redirect("/errorpage");
    }

    const userData = await user.findById(userId);
    const commentData = await comments.findById(commentId);
    res.render("layout/commentFile", { commentData, user: userData, isAdmin });
  }
);

app.get("/Admintask", isAuthenicated, async (req, res) => {
  try {
    const isAdmin = false;
    const userId = req.id;
    if (!userId) {
      return res.redirect("/task");
    }

    const userData = await user.findById(userId);

    const todo = await task.find({ userId }).sort({ createdAt: -1 });
    const todolist = todo.filter((t) => t.assignedBy === "admin");
    res.render("layout/todolist", {
      user: userData,
      isAdmin,
      todolist,
      isShow: false,
    });
  } catch (error) {}
});

app.get("/assignedtask", isAuthenicated, isAdminCheck, async (req, res) => {
  try {
    const isAdmin = req.isAdmin;
    const userId = req.id;
    if (!userId) {
      return res.redirect("/task");
    }

    const userData = await user.findById(userId);

    const todo = await task.find().populate("userId").sort({ createdAt: -1 });

    const todolist = todo.filter((t) => t.assignedBy === "admin");

    res.render("layout/AdminTaskShow", {
      user: userData,
      isAdmin,
      todolist,
    });
  } catch (error) {}
});

app.get("/profile", isAuthenicated, isAdminCheck, async (req, res) => {
  try {
    const isAdmin = req.isAdmin;
    const userId = req.id;
    if (!userId) {
      return res.redirect("/task");
    }

    const userData = await user.findById(userId);
    const totalTask = await task.find();
    const todolist = await task.find({ userId });

    const adminAssignedtask = totalTask.filter(
      (t) => t.assignedBy === "admin"
    ).length;

    res.render("layout/Profile", {
      user: userData,
      isAdmin,
      todolist,
      adminAssignedtask,
    });
  } catch (error) {}
});

app.get("/edit-profilePage", isAuthenicated, isAdminCheck, async (req, res) => {
  try {
    const isAdmin = req.isAdmin;
    const userId = req.id;
    if (!userId) {
      return res.redirect("/task");
    }

    const userData = await user.findById(userId);
    if (userData) {
      res.render("layout/EditProfile", {
        isAdmin,
        user: userData,
      });
    }
  } catch (error) {}
});

app.post(
  "/editProfile",
  isAuthenicated,
  isAdminCheck,
  upload.single("profilePic"),
  async (req, res) => {
    try {
      const userId = req.id;
      if (!userId) {
        return res.redirect("/");
      }
      const { firstName, lastName } = req.body;

      const profilePic = req.file;

      if (!firstName || !lastName) {
        return res.redirect("/profile");
      }

      const updateUser = {
        firstName,
        lastName,
      };

      if (profilePic) {
        updateUser.profilePic = profilePic.filename;
      }

      const userData = await user.findByIdAndUpdate(userId, updateUser);

      if (userData) {
        return res.redirect("/profile");
      } else {
        return res.redirect("/");
      }
    } catch (error) {}
  }
);

app.get("/medialibrary", isAuthenicated, isAdminCheck, async (req, res) => {
  try {
    const userId = req.id;
    const isAdmin = req.isAdmin;
    if (userId) {
      const userData = await user.findById(userId);
      let media = await mediaLibrary.findOne({ userId });
      if (!media) {
        media = "";
      }
      res.render("layout/MediaLibrary", { isAdmin, user: userData, media });
    }
  } catch (error) {}
});

app.post(
  "/submitMedia",
  upload.single("mediaImage"),
  isAuthenicated,
  isAdminCheck,
  async (req, res) => {
    try {
      const userId = req.id;
      if (!userId) {
        return res.redirect("/medialibrary");
      }

      const { url, tag } = req.body;
      const mediaImage = req.file;

      if (!tag) {
        return res.redirect("/medialibrary");
      }

      if (!mediaImage && !url) {
        return res.redirect("/medialibrary");
      }

      let media = await mediaLibrary.findOne({ userId });
      let userLimit = await userStoragelimit.findOne({ userId });

      if (!media) {
        media = new mediaLibrary({
          userId,
          medialibrary: [],
        });
      }

      if (!userLimit) {
        userLimit = new userStoragelimit({
          userId,
          maxStorage: 1024,
          useStorage: 0,
        });
      }

      let newSize = 0;
      if (mediaImage) {
        newSize = mediaImage.size / (1024 * 1024);
        if (userLimit.useStorage + newSize > userLimit.maxStorage) {
          return res.redirect("/medialibrary?error=Storage limit exceeded");
        }
        userLimit.useStorage += newSize;
        await userLimit.save();
      }

      if (mediaImage) {
        const imageUrl = `uploads/${mediaImage.filename}`;
        media.medialibrary.push({
          type: "image",
          url: imageUrl,
          tag: tag.trim(),
          size: newSize,
        });
      }

      if (url) {
        try {
          media.medialibrary.push({
            type: "url",
            url: url.trim(),
            tag: tag.trim(),
            size: 0,
          });
        } catch (error) {
          return res.redirect("/medialibrary");
        }
      }

      await media.save();

      res.redirect("/medialibrary");
    } catch (error) {
      console.error("Error", error);
      res.redirect("/medialibrary");
    }
  }
);

app.post(
  "/EditMedia/:imageId",
  upload.single("mediaImage"),
  isAuthenicated,
  isAdminCheck,
  async (req, res) => {
    try {
      const userId = req.id;
      const imageId = req.params.imageId;

      if (!userId || !imageId) {
        return res
          .status(400)
          .json({ error: "User ID or Image ID is missing" });
      }

      const { url, tag } = req.body;
      const mediaImage = req.file;

      if (!tag) {
        return res.status(400).json({ message: "Tag is required" });
      }

      if (!mediaImage && !url) {
        return res
          .status(400)
          .json({ message: "Either an image or URL must be provided" });
      }

      const media = await mediaLibrary.findOne({ userId });
      let userLimit = await userStoragelimit.findOne({ userId });

      if (!media) {
        return res
          .status(404)
          .json({ message: "Media library not found for this user" });
      }

      const mediaItem = media.medialibrary.find(
        (item) => item._id.toString() === imageId
      );
      if (!mediaItem) {
        return res.status(404).json({ message: "Media item not found" });
      }

      let newSize = 0;
      if (mediaImage) {
        newSize = mediaImage.size / (1024 * 1024);
        if (userLimit.useStorage + newSize > userLimit.maxStorage) {
          return res.redirect("/medialibrary?error=Storage limit exceeded");
        }
        userLimit.useStorage -= mediaItem.size;
        userLimit.useStorage += newSize;
        await userLimit.save();
      }

      mediaItem.tag = tag.trim();

      if (mediaImage) {
        mediaItem.type = "image";
        mediaItem.url = `../../uploads/${mediaImage.filename}`;
        mediaItem.size = newSize;
      } else if (url) {
        try {
          mediaItem.type = "url";
          mediaItem.url = url.trim();
        } catch (error) {
          return res.status(400).json({ error: "Invalid URL format" });
        }
      }

      await media.save();

      return res.redirect("/medialibrary");
    } catch (error) {
      console.error("Error updating media:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post("/deleteImage/:imageId", isAuthenicated, async (req, res) => {
  try {
    const userId = req.id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User ID not found" });
    }

    const mediaData = await mediaLibrary.findOne({ userId });
    let userLimit = await userStoragelimit.findOne({ userId });
    if (!mediaData) {
      return res
        .status(404)
        .json({ message: "Media library not found for this user" });
    }

    const imageId = req.params.imageId;
    if (!imageId) {
      return res.status(400).json({ message: "Invalid image ID" });
    }

    if (userLimit) {
      const mediaItem = mediaData.medialibrary.filter(
        (item) => item._id.toString() === imageId
      );

      userLimit.useStorage -= mediaItem[0].size;
      await userLimit.save();
    }

    const updatedLibrary = mediaData.medialibrary.filter(
      (item) => item._id.toString() !== imageId
    );

    mediaData.medialibrary = updatedLibrary;
    await mediaData.save();
    return res.status(200).json({ message: "image deleted successfully" });
  } catch (error) {}
});

app.get(
  "/imagepreview/:imageId",
  isAuthenicated,
  isAdminCheck,
  async (req, res) => {
    try {
      const userId = req.id;
      const isAdmin = req.isAdmin;
      if (!userId) {
        return res.status(404).json({
          message: "No Image Id found",
        });
      }
      const userData = await user.findById(userId);
      const mediaData = await mediaLibrary.findOne({ userId });

      if (!mediaData) {
        return res
          .status(404)
          .json({ message: "Media library not found for this user" });
      }

      const imageId = req.params.imageId;
      if (!imageId) {
        return res.status(400).json({ message: "Invalid image ID" });
      }

      const Library = mediaData.medialibrary.filter(
        (item) => item._id.toString() === imageId
      );

      if (!Library) {
        return res.status(400).json({ message: "No Image found" });
      }

      return res.render("layout/imagePreview", {
        Library,
        user: userData,
        isAdmin,
      });
    } catch (error) {
      console.log("error", error);
    }
  }
);

app.get("/downloadTask", isAuthenicated, isAdminCheck, async (req, res) => {
  try {
    const isAdmin = req.isAdmin;
    const userId = req.id;

    if (!userId) {
      return res.redirect("/");
    }

    const userData = await user.findById(userId);

    const tasks = await task.find({ userId }).populate("userId");
    const taskIds = tasks.map((task) => task._id);
    const commentList = await comments.find({ taskId: { $in: taskIds } });

    const taskWithComments = tasks.map((task) => {
      task.comments = commentList.filter(
        (c) => c.taskId.toString() === task._id.toString()
      );
      return task;
    });

    const html = await ejs.renderFile(
      path.join(__dirname, "views", "layout", "pdfLayout.ejs"),
      { tasks: taskWithComments },
      { async: true }
    );

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const filePath = path.join(`task-reports/user-${userId}-tasks.pdf`);
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "10mm", right: "10mm" },
    });

    await browser.close();

    return res.render("layout/Download", { user: userData, isAdmin, filePath });
  } catch (error) {}
});

app.get("/download-pdf", (req, res) => {
  const filePath = req.query.filePath;
  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (err) {
        console.error("Error downloading PDF:", err);
      }

      fs.unlinkSync(filePath);
    });
  } else {
    res.status(404).send("PDF not found");
  }
});

app.get("/forgetPassword", async (req, res) => {
  try {
    res.render("layout/ForgetPassword");
  } catch (error) {}
});

function generateOtp() {
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp = otp + Math.floor(Math.random() * 10);
  }
  return otp;
}

function validateOtp(otpNumber,otp) {
  if (otpNumber == otp) {
    return true;
  }
  return false;
}

app.post("/forgetPassword", async (req, res) => {
  try {
  
    const { email } = req.body;
    if (!email) {
      return res.redirect("/forgetPassword");
    }
    const userData = await user.findOne({ email });
    if (!userData) {
      return res.redirect("/forgetPassword");
    }
    const otpData = generateOtp();

    await user.findByIdAndUpdate(userData._id,{otp:otpData})

    res.render("layout/OtpVerification", { user: userData });
  } catch (error) {}
});

app.post("/validateOtp", async (req, res) => {
  try {
    const { email, otpNumber } = req.body;

    if (!email || !otpNumber) {
      return res.redirect("/forgetPassword");
    }
    const userData = await user.findOne({ email });
    if (!userData) {
      return res.redirect("/forgetPassword");
    }

    let otpData = otpNumber.reduce((val1, val2) => val1 + val2);
   
  

      const validate = validateOtp(otpData, userData.otp);
      if (validate) {
      await user.findByIdAndUpdate(userData._id,{otp:''})
        return res.render("layout/ResetPassword", { user: userData });
   
    }
  } catch (error) {}
});

app.post("/resetPassword", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.redirect("/forgetPassword");
    }

    if (password !== confirmPassword) {
      return res
        .status(404)
        .json({ message: "Password and the confirmpassword should be same " });
    }

    const userExist = await user.findOne({ email });

    if (!userExist) {
      return res.redirect("/forgetPassword");
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const updateUser = {
      password: hashPassword,
    };

    await user.findByIdAndUpdate(userExist._id, updateUser);

    return res.redirect("/loginPage");
  } catch (error) {}
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
