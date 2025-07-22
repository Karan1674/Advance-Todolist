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
const PDFDocument = require('pdfkit');
dotenv.config();
const { OAuth2Client } = require("google-auth-library");
const stripe = require("stripe")(process.env.Stripe_Secret_key);
const pricingPlans = require("./public/pricingPlans.js");
const paymentDetail = require("./models/paymentDetail.js");
const crypto = require("crypto");

const { default: axios, get, head } = require("axios");
const { type } = require("os");
const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
const { error } = require("console");
const { default: mongoose } = require("mongoose");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();
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

const razorPayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

connectDB();
app.use(express.json());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.urlencoded({ extended: true }));

const isAuthenicated = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    const toastMessage = req.query.message || "";
    const toastType = req.query.type || "info"; // success, error, or inf

    if (!token) {
      return res.render("layout/Home.ejs", {
        user: null,
        isAdmin: false,
        pricingPlans,
        toastMessage,
        toastType,
      });
    }

    const decode = jwt.verify(token, process.env.SECRET_KEY);

    if (!decode) {
      return res.render("layout/Home.ejs", {
        user: null,
        isAdmin: false,
        pricingPlans,
        toastMessage,
        toastType,
      });
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

  const toastMessage = req.query.message || "";
  const toastType = req.query.type || "info"; // success, error, or inf

  const isAdmin = req.isAdmin;
  if (userId) {
    const userData = await user.findById(userId);
    if (userData) {
      return res.render("layout/Home.ejs", {
        user: userData,
        isAdmin,
        pricingPlans,
        toastMessage,
        toastType,
      });
    } else {
      return res.redirect("/loginPage");
    }
  }
  return res.render("layout/Home.ejs", {
    user: null,
    isAdmin: false,
    pricingPlans,
    toastMessage,
    toastType,
  });
});

app.get("/signupPage/:plan", async (req, res) => {
  const token = req.cookies.token;
  const toastMessage = req.query.message || "";
  const toastType = req.query.type || "info"; // success, error, or info
  const plan = req.params.plan || "starter";
  if (plan == "pro" || plan == "premium") {
    return res.redirect(
      "/signupPage/starter?message=First Create your Account or Sign In your Account&type=info"
    );
  }

  if (!token) {
    return res.render("layout/SignUp.ejs", { toastMessage, toastType, plan });
  } else {
    return res.redirect("/task?message=Already logged in&type=info");
  }
});

app.post("/userSignUp", upload.single("profilePic"), async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const profilePic = req.file;
    

    if (!firstName || !lastName || !email || !password || !profilePic) {
      return res.redirect(
        "/signupPage?message=All fields are required&type=error"
      );
    }

    const userExist = await user.findOne({ email });

    if (userExist) {
      return res.redirect(
        "/signupPage?message=Email already registered&type=error"
      );
    }

    const hashPassword = await bcrypt.hash(password, 10);

    await user.create({
      firstName,
      lastName,
      email,
      password: hashPassword,
      profilePic: profilePic.filename,
      otp: "",
      Package: "starter",
    });
    return res.redirect(
      "/loginPage?message=Signup successful! Please log in&type=success"
    );
  } catch (error) {
    console.log(error);
    return res.redirect(
      "/signupPage?message=An error occurred during signup&type=error"
    );
  }
});

app.get("/loginPage", async (req, res) => {
  const token = req.cookies.token;
  const toastMessage = req.query.message || "";
  const toastType = req.query.type || "info";

  if (!token) {
    return res.render("layout/Login.ejs", { toastMessage, toastType });
  } else {
    return res.redirect("/?message=Already logged in&type=info");
  }
});

app.post("/userlogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.redirect(
        "/loginPage?message=Email and password are required&type=error"
      );
    }

    const userData = await user.findOne({ email });

    if (!userData) {
      return res.redirect("/loginPage?message=User not found&type=error");
    }

    const isPasswordMatch = bcrypt.compare(password, userData.password);

    if (!isPasswordMatch) {
      return res.redirect("/loginPage?message=Incorrect password&type=error");
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

    res.redirect("/?message=Login successful&type=success");
  } catch (error) {
    console.log(error);
    return res.redirect(
      "/loginPage?message=An error occurred during login&type=error"
    );
  }
});

app.post("/googleSignIn/:plan", async (req, res) => {
  try {
    const { credential } = req.body;
    const plan = req.params.plan || "starter";
    console.log(plan);
    if (!credential) {
      return res.redirect(
        "/signupPage?message=Google authentication failed&type=error"
      );
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const {
      sub: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
      picture: profilePic,
    } = payload;

    let userData = await user.findOne({ email });

    if (!userData) {
      userData = await user.create({
        firstName: firstName || "User",
        lastName: lastName || "Google",
        email,
        googleId,
        profilePic: profilePic || "",
        password: "",
        otp: "",
        packageDetails: plan,
      });
    } else if (!userData.googleId) {
      userData.googleId = googleId;
      userData.profilePic = profilePic || userData.profilePic;
      await userData.save();
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

    return res.redirect("/?message=Google Sign-In successful&type=success");
  } catch (error) {
    console.log(error);
    return res.redirect("/signupPage?message=Google Sign-In failed&type=error");
  }
});

app.get("/forgetPassword", async (req, res) => {
  try {
    const toastMessage = req.query.message || "";
    const toastType = req.query.type || "info";
    res.render("layout/ForgetPassword", { toastMessage, toastType });
  } catch (error) {
    res.redirect("/forgetPassword?message=Error loading page&type=error");
  }
});

function generateOtp() {
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp = otp + Math.floor(Math.random() * 10);
  }
  return otp;
}

function validateOtp(otpNumber, otp) {
  if (otpNumber == otp) {
    return true;
  }
  return false;
}

app.post("/forgetPassword", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.redirect(
        "/forgetPassword?message=Email is required&type=error"
      );
    }
    const userData = await user.findOne({ email });
    if (!userData) {
      return res.redirect("/forgetPassword?message=User not found&type=error");
    }
    const otpData = generateOtp();

    await user.findByIdAndUpdate(userData._id, { otp: otpData });

    res.render("layout/OtpVerification", {
      user: userData,
      toastMessage: "OTP sent to your email",
      toastType: "success",
    });
  } catch (error) {
    res.redirect("/forgetPassword?message=Error sending OTP&type=error");
  }
});

app.post("/validateOtp", async (req, res) => {
  try {
    
    const { email, otpNumber } = req.body;

    if (!email || !otpNumber) {
      return res.redirect(
        "/forgetPassword?message=Missing email or OTP&type=error"
      );
    }
    const userData = await user.findOne({ email });
    if (!userData) {
      return res.redirect("/forgetPassword?message=User not found&type=error");
    }

    let otpData = otpNumber.reduce((val1, val2) => val1 + val2);

    const validate = validateOtp(otpData, userData.otp);
    if (validate) {
      await user.findByIdAndUpdate(userData._id, { otp: "" });
      return res.render("layout/ResetPassword", {
        user: userData,
        toastMessage: "Otp Match Successfully",
        toastType: "info",
      });
    } else {
      return res.redirect("/forgetPassword?message=Invalid OTP&type=error");
    }
  } catch (error) {
    res.redirect("/forgetPassword?message=Error validating OTP&type=error");
  }
});

app.post("/resetPassword", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.redirect(
        "/forgetPassword?message=Missing required fields&type=error"
      );
    }

    if (password !== confirmPassword) {
      return res.redirect(
        "/forgetPassword?message=Passwords do not match&type=error"
      );
    }

    const userExist = await user.findOne({ email });

    if (!userExist) {
      return res.redirect("/forgetPassword?message=User not found&type=error");
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const updateUser = {
      password: hashPassword,
    };

    await user.findByIdAndUpdate(userExist._id, updateUser);

    return res.redirect(
      "/loginPage?message=Password reset successful&type=success"
    );
  } catch (error) {
    res.redirect("/forgetPassword?message=Error resetting password&type=error");
  }
});

app.get("/logout", isAuthenicated, (req, res) => {
  try {
    res.clearCookie("token");
    return res.redirect("/?message=Logout successful&type=success");
  } catch (error) {
    console.log("error", error);
  }
});

app.get("/task", isAuthenicated, isAdminCheck, async (req, res) => {
  
  try {
        const toastMessage = req.query.message || "";
    const toastType = req.query.type || "info"; // success, error, or inf
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
        toastMessage,
        toastType
      });
    } else if (userData) {
      return res.render("layout/todolist.ejs", {
        todolist,
        user: userData,
        isAdmin,
        isShow: true,
        toastMessage,
        toastType
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

app.post("/addtask",
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

app.post("/assigntask",
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

app.post("/deletetask/:taskId",
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

app.get("/taskDetail/:taskId",
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

app.get("/edittaskpage/:taskId",
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

app.post("/editTask/:taskId",
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

app.get("/editAdminpage/:taskId",
  isAuthenicated,
  isAdminCheck,
  async (req, res) => {
    try {
      const userId = req.id;
      const isAdmin = req.isAdmin;
      const { taskId } = req.params;
      if (!taskId) {
        return res.redirect("/errorpage&message=Task ID is required&type=error");
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

app.post("/editAdminTask/:taskId",
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

app.post("/addComment/:taskId",
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

app.get("/commentfileShow/:commentId",
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

app.post("/editProfile",
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

app.post("/submitMedia",
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

app.post("/EditMedia/:imageId",
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

app.get("/imagepreview/:imageId",
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

app.get("/upgrade", isAuthenicated, isAdminCheck, async (req, res) => {
  try {
    const userId = req.id;
    const isAdmin = req.isAdmin;
    const userData = await user.findById(userId);
    if (!userData) {
      return res.redirect("/loginPage?message=User not found&type=error");
    }

    return res.render("layout/upgrade", { user: userData, isAdmin });
  } catch (error) {
    console.error("Error rendering upgrade page:", error);
    return res.redirect("/loginPage?message=Something went wrong&type=error");
  }
});

app.post("/payment/stripe", isAuthenicated, async (req, res) => {
  const { country, plan } = req.body;
  const userData = await user.findById(req.id);

  if (!userData) {
    return res.status(401).json({ message: "Please log in to proceed." });
  }

  if (!["pro", "premium"].includes(plan)) {
    return res.status(400).json({ message: "Invalid plan selected." });
  }

  if (!country) {
    return res.status(400).json({ message: "Select country First." });
  }

  try {
    const amount = plan === "pro" ? 9900 : 49900;

    const currency = "usd";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
            },
            unit_amount: amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      client_reference_id: userData._id.toString(),
      success_url: `${req.protocol}://${req.get(
        "host"
      )}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${req.protocol}://${req.get(
        "host"
      )}/?message=Payment cancelled&type=error`,
      metadata: { plan },
    });

    await paymentDetail.create({
      userId: userData._id,
      gateway: "stripe",
      country,
      customerId: userData.stripeCustomerId || null,
      sessionId: session.id,
      subscriptionId: null,
      status: "pending",
      amountPaid: amount,
      plan,
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "Error initiating Stripe payment.",
      error: error.message,
    });
  }
});

app.get("/success", isAuthenicated, async (req, res) => {
  const { session_id, plan } = req.query;
  const userData = await user.findById(req.id);

  if (!userData) {
    return res.redirect("/?message=User not found&type=error");
  }

  if (!session_id || !plan) {
    return res.redirect("/?message=Invalid payment data&type=error");
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid" || session.status !== "complete") {
      return res.redirect("/?message=Payment not completed&type=error");
    }

    await user.updateOne(
      { _id: userData._id },
      { $set: { packageDetails: plan } }
    );

    await paymentDetail.updateOne(
      { userId: userData._id, sessionId: session.id },
      {
        $set: {
          subscriptionId: session.subscription || null,
          customerId: session.customer || userData.stripeCustomerId || null,
          status: "active",
          lastPaymentDate: new Date(),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }
    );

    return res.redirect(`/?message=Plan upgraded to ${plan}&type=success`);
  } catch (error) {
    return res.redirect("/?message=Error confirming payment&type=error");
  }
});

const getPaypalAccessToken = async () => {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const baseUrl = process.env.Paypal_Base_Url;

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenResponse = await axios.post(
      `${baseUrl}v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
      }
    );
    const accessToken = tokenResponse.data.access_token;

    return accessToken;
  } catch (error) {
    console.error("Error fetching PayPal access token:", error);
    throw error;
  }
};

app.post("/payment/paypal", isAuthenicated, async (req, res) => {
  const { country, plan } = req.body;
  const userData = await user.findById(req.id);

  if (!userData) {
    return res.status(401).json({ message: "Please log in to proceed." });
  }

  if (!["pro", "premium"].includes(plan)) {
    return res.status(400).json({ message: "Invalid plan selected." });
  }

  if (!country) {
    return res.status(400).json({ message: "Select country First." });
  }

  try {
    const accessToken = await getPaypalAccessToken();

    const amountData = plan === "pro" ? 9900 : 49900;

    const currency = "USD";
    const amountFormatted = parseFloat((amountData / 100).toFixed(2));

    const planData = {
      name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
      description: `Monthly subscription for ${plan} plan`,
      value: amountFormatted,
      currency: currency,
      return_url: `${req.protocol}://${req.get(
        "host"
      )}/success/paypal?plan=${plan}&gateway=paypal`,
      cancel_url: `${req.protocol}://${req.get("host")}`,
    };
    const baseUrl = process.env.Paypal_Base_Url;

    const orderResponse = await axios.post(
      `${baseUrl}v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            items: [
              {
                name: planData.name,
                description: planData.description,
                quantity: "1",
                unit_amount: {
                  currency_code: planData.currency,
                  value: planData.value,
                },
              },
            ],
            amount: {
              currency_code: planData.currency,
              value: planData.value,
              breakdown: {
                item_total: {
                  currency_code: planData.currency,
                  value: planData.value,
                },
              },
            },
          },
        ],
        application_context: {
          return_url: planData.return_url,
          cancel_url: planData.cancel_url,
          user_action: "PAY_NOW",
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const paypalUrl = orderResponse.data.links.find(
      (link) => link.rel === "approve"
    ).href;

    await paymentDetail.create({
      userId: userData._id,
      gateway: "paypal",
      country,
      customerId: null,
      sessionId: paypalUrl.split("=").pop(),
      subscriptionId: null,
      status: "pending",
      amountPaid: amountData,
      plan,
    });

    return res.json({ url: paypalUrl });
  } catch (error) {
    console.error("Error initiating PayPal payment:", error); // More detailed logging of errors
    return res.status(500).json({
      message: "Error initiating PayPal payment.",
      error: error.message,
    });
  }
});

app.get("/success/paypal", isAuthenicated, async (req, res) => {
  const { token, plan, gateway } = req.query;
  const userData = await user.findById(req.id);

  if (!userData) {
    return res.redirect("/?message=User not found&type=error");
  }

  if (!token || !plan || gateway !== "paypal") {
    return res.redirect("/?message=Invalid payment data&type=error");
  }

  try {
    const accessToken = await getPaypalAccessToken();

    const orderResponse = await axios.get(
      `${process.env.Paypal_Base_Url}v2/checkout/orders/${token}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (orderResponse.data.status !== "APPROVED") {
      return res.redirect("/?message=Payment not approved&type=error");
    }

    const captureResponse = await axios.post(
      `${process.env.Paypal_Base_Url}v2/checkout/orders/${token}/capture`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (captureResponse.data.status !== "COMPLETED") {
      return res.redirect("/?message=Payment capture failed&type=error");
    }

    // Update user package details
    await user.updateOne(
      { _id: userData._id },
      { $set: { packageDetails: plan } }
    );

    await paymentDetail.updateOne(
      { userId: userData._id, sessionId: token },
      {
        $set: {
          subscriptionId: captureResponse.data.id || null,
          customerId: captureResponse.data.payer?.payer_id || null,
          status: "active",
          lastPaymentDate: new Date(),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }
    );

    return res.redirect(`/?message=Plan upgraded to ${plan}&type=success`);
  } catch (error) {
    console.error("Error confirming PayPal payment:", error);
    return res.redirect("/?message=Error confirming payment&type=error");
  }
});

app.post("/payment/phonepe", isAuthenicated, async (req, res) => {
  const { country, plan } = req.body;
  const userData = await user.findById(req.id);

  if (!userData) {
    return res.status(401).json({ message: "Please log in to proceed." });
  }

  if (!["pro", "premium"].includes(plan)) {
    return res.status(400).json({ message: "Invalid plan selected." });
  }

  if (!country) {
    return res.status(400).json({ message: "Select country First." });
  }

  try {
    const amountData = plan === "pro" ? 9900 : 49900; // Base amount in paise
    const amount = amountData * 100;
    const currency = "INR";

    const paymentPayload = {
      merchantId: process.env.MERCHANT_ID,
      merchantUserId: userData._id.toString(),
      amount: amount,
      currency: currency,
      merchantTransactionId: `${userData._id}_${Date.now()}`,
      redirectUrl: `http://localhost:3000/success/phonepe?plan=${plan}`,
      redirectMode: "POST",
      // callbackUrl: `http://localhost:3000/payment/phonepe/callback`,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payload = Buffer.from(JSON.stringify(paymentPayload)).toString(
      "base64"
    );
    const keyIndex = 1;
    const string = payload + "/pg/v1/pay" + process.env.MERCHANT_KEY;
    const sha256Hash = crypto.createHash("sha256").update(string).digest("hex");
    const checkSum = sha256Hash + "###" + keyIndex;

    const options = {
      method: "POST",
      url: `${process.env.MERCHANT_BASE_URL}`,
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "X-VERIFY": checkSum,
        "X-MERCHANT-ID": process.env.MERCHANT_ID,
      },
      data: {
        request: payload,
      },
    };

    const response = await axios.request(options);

    // Create payment detail record
    await paymentDetail.create({
      userId: userData._id,
      gateway: "phonepe",
      country,
      customerId: userData._id.toString(),
      sessionId: paymentPayload.merchantTransactionId,
      // merchantTransactionId: paymentPayload.merchantTransactionId,
      subscriptionId: null,
      status: "pending",
      amountPaid: amount,
      plan,
    });

    res.json({ url: response.data.data.instrumentResponse.redirectInfo.url });
  } catch (error) {
    console.error("Error initiating PhonePe payment:", error);
    return res.status(500).json({
      message: "Error initiating PhonePe payment.",
      error: error.message,
    });
  }
});

app.post("/success/phonepe", async (req, res) => {
  try {
    const { plan } = req.query;

    const { transactionId } = req.body;

    const merchantTransactionId = transactionId;

    const string = `/pg/v1/status/${process.env.MERCHANT_ID}/${merchantTransactionId}${process.env.MERCHANT_KEY}`;

    const sha256Hash = crypto.createHash("sha256").update(string).digest("hex");
    const checksum = sha256Hash + "###1";

    const response = await axios.get(
      `${process.env.MERCHANT_STATUS_URL}/${process.env.MERCHANT_ID}/${merchantTransactionId}`,
      {
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": process.env.MERCHANT_ID,
        },
      }
    );

    if (response.data.code === "PAYMENT_SUCCESS") {
      const paymentDetailData = await paymentDetail.findOneAndUpdate(
        { sessionId: merchantTransactionId },
        {
          $set: {
            status: "active",
            subscriptionId: transactionId,
            lastPaymentDate: new Date(),
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        }
      );

      await user.updateOne(
        { _id: paymentDetailData.userId },
        { $set: { packageDetails: plan } }
      );
    }

    return res.redirect(`/?message=Plan upgraded to ${plan}&type=success`);
  } catch (err) {
    console.error("Callback error:", err);
    return res.sendStatus(500);
  }
});

app.post("/payment/razorpay", isAuthenicated, async (req, res) => {
  const { country, plan } = req.body;
  const userData = await user.findById(req.id);

  if (!userData) {
    return res.status(401).json({ message: "Please log in to proceed." });
  }

  if (!["pro", "premium"].includes(plan)) {
    return res.status(400).json({ message: "Invalid plan selected." });
  }

  if (!country) {
    return res.status(400).json({ message: "Select country First." });
  }

  try {
    const amountData = plan === "pro" ? 9900 : 49900; // Base amount in paise
    const amount = amountData * 100;
    const currency = "INR";
    const options = {
      amount: amount,
      currency: currency,
      receipt: `receipt_${userData._id}}`,
    };

    const response = await razorPayInstance.orders.create(options);
    if (response) {
      await paymentDetail.create({
        userId: userData._id,
        gateway: "razorpay",
        country,
        customerId: userData._id.toString(),
        sessionId: response.id,
        subscriptionId: null,
        status: "pending",
        amountPaid: amount,
        plan,
      });
    }
    console.log("Razorpay order created:", response);
    res.json({
      success: true,
      orderId: response.id,
      amount: options.amount,
      currency: options.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
    // res.json({ id: response.id });
  } catch (error) {
    console.error("Error initiating Razorpay payment:", error);
    return res.status(500).json({
      message: "Error initiating Razorpay payment.",
      error: error.message,
    });
  }
});

app.post("/success/razorpay", isAuthenicated, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } =
    req.body;

  const userData = await user.findById(req.id);
  if (!userData) return res.status(404).json({ message: "User not found." });

  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generated_signature = hmac.digest("hex");

  if (generated_signature === razorpay_signature) {
    await paymentDetail.updateOne(
      { sessionId: razorpay_order_id },
      {
        $set: {
          subscriptionId: razorpay_payment_id,
          status: "active",
          lastPaymentDate: new Date(),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }
    );

    await user.updateOne(
      { _id: userData._id },
      { $set: { packageDetails: plan } }
    );

    return res.json({ success: true });
  } else {
    return res
      .status(400)
      .json({ success: false, message: "Invalid signature" });
  }
});


app.get("/errorpage", isAuthenicated, async(req, res) => {

  const toastMessage = req.query.message || "An error occurred. Please try again later.";
  const toastType = req.query.type || "error";
  const userId = req.id;
  const isAdmin = req.isAdmin;

  if (!userId) {
    return res.status(401).render("layout/ErrorPage", {
      toastMessage: "Unauthorized access. Please log in.",
      toastType: "error",
      user: null,
      isAdmin: false,
    });
  }
  const userData = await user.findById(userId);
  if (!userData) {
    return res.status(404).render("layout/ErrorPage", {
      toastMessage: "User not found.",
      toastType: "error",
      user: null,
      isAdmin: false,
    });
  }
  res.render("layout/ErrorPage", {
   toastMessage: toastMessage,
    toastType: toastType,
    user: userData,
    isAdmin,
  });
});

app.get('/invoices', isAuthenicated, async (req, res) => {
  const userId = req.id;
  const isAdmin = req.isAdmin;
  if (!userId) {
    return res.status(401).redirect('/errorpage?message=Unauthorized access. Please log in.&type=error');
  }
  const userData = await user.findById(userId);
  if (!userData) {
    return res.status(404).redirect('/errorpage?message=User not found&type=error');  
  }

  try {
    const invoices = await paymentDetail.find({ userId });
    res.render('layout/invoices', { invoices, user: userData, isAdmin });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).redirect('/errorpage?message=Error fetching invoices&type=error');
  }
});


app.get('/invoice/view/:id', isAuthenicated, async (req, res) => {
  const userId = req.id;
  const isAdmin = req.isAdmin;
  const invoiceId = req.params.id;

  if (!mongoose.isValidObjectId(invoiceId)) {
    return res.status(400).redirect('/errorpage?message=Invalid invoice ID&type=error');
  }

  try {
    const invoice = await paymentDetail.findById(invoiceId);
    if (!invoice) {
      return res.status(404).redirect('/errorpage?message=Invoice not found&type=error');
    }

    if (invoice.userId.toString() !== userId) {
      return res.status(403).redirect('/errorpage?message=You are not authorized to view this invoice&type=error');
    }

    const userData = await user.findById(userId).lean();
    if (!userData) {
      return res.status(404).redirect('/errorpage?message=User not found&type=error');
    }

    res.render('layout/invoiceView', {
      invoice,
      user: userData,
      isAdmin,
      currentPage: 'invoices',
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).redirect('/errorpage?message=Error fetching invoice&type=error');
  }
});

app.get('/invoice/:id', isAuthenicated, async (req, res) => {
 const userId = req.id;
  const invoiceId = req.params.id;

  if (!mongoose.isValidObjectId(invoiceId)) {
    return res.status(400).redirect('/errorpage?message=Invalid invoice ID&type=error');
  }

  try {
    const invoice = await paymentDetail.findById(invoiceId).populate('userId');
    if (!invoice) {
      return res.status(404).redirect('/errorpage?message=Invoice not found&type=error');
    }

    if (invoice.userId._id.toString() !== userId) {
      return res.status(403).redirect('/errorpage?message=You are not authorized to view this invoice&type=error');
    }


    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceId}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    const colors = {
      emerald600: '#10B981',
      gray900: '#111827',
      gray700: '#374151',
      gray500: '#6B7280',
      gray300: '#D1D5DB',
      emerald50: '#ECFDF5',
    };

  
    doc.registerFont('Roboto', 'Roboto-Regular.ttf'); 
    doc.registerFont('Roboto-Bold', 'Roboto-Bold.ttf');


    const logoPath = path.join(__dirname, '../public/assets/list-check-solid.svg');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 50, { width: 100 });
    } else {
      doc.font('Helvetica-Bold').fontSize(14).fillColor(colors.gray900).text('Task Manager', 50, 50);
    }
    doc.font('Helvetica').fontSize(10).fillColor(colors.gray700)
      .text('Task Manager Inc.', 400, 50, { align: 'right' })
      .text('123 Productivity Lane, Tech City, TX 12345', 400, 65, { align: 'right' })
      .text('support@taskmanager.com', 400, 90, { align: 'right' });
    doc.moveDown(4);


    doc.font('Helvetica-Bold').fontSize(20).fillColor(colors.emerald600)
      .text('Invoice', 50, 120, { align: 'center' });
    doc.rect(50, 150, 495, 40).fill(colors.emerald50);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(colors.gray900)
      .text(`Invoice`, 60, 160);
    doc.font('Helvetica').fontSize(12).fillColor(colors.gray700)
      .text(`Issued: ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}`, 400, 160, { align: 'right' });
    doc.moveDown(2);


    doc.font('Helvetica-Bold').fontSize(14).fillColor(colors.gray900)
      .text('Billed To', 55, 200);
    doc.font('Helvetica').fontSize(12).fillColor(colors.gray700)
      .text(`${invoice.userId.firstName} ${invoice.userId.lastName}`, 55, 220)
      .text(`${invoice.userId.email}`, 55, 235)
      .text(`${invoice.country || 'N/A'}`, 55, 250);
    doc.moveDown(2);


    const tableTop = 280;
    const rowHeight = 30;
    const colWidths = [150, 150, 150, 150];
    const headers = ['Plan', 'Gateway', 'Amount Paid', 'Status'];
    const details = [
      invoice.plan || 'N/A',
      invoice.gateway || 'N/A',
      (() => {
        const currency = ['stripe', 'paypal'].includes(invoice.gateway?.toLowerCase()) ? '$' :
                        ['razorpay', 'phonepe'].includes(invoice.gateway?.toLowerCase()) ? '₹' : '';
        return invoice.amountPaid ? `${currency}${(invoice.amountPaid / 100).toFixed(2)}` : 'N/A';
      })(),
      invoice.status || 'Pending',
    ];


    doc.rect(50, tableTop, 495, rowHeight).fill(colors.emerald50);
    headers.forEach((header, i) => {
      doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.gray900)
        .text(header, 50 + (i * colWidths[i]), tableTop + 8, { width: colWidths[i], align: 'left' });
    });


    doc.rect(50, tableTop + rowHeight, 495, rowHeight).fill('white');
    details.forEach((detail, i) => {
      doc.font('Helvetica').fontSize(12).fillColor(colors.gray700)
        .text(detail, 50 + (i * colWidths[i]), tableTop + rowHeight + 8, { width: colWidths[i], align: 'left' });
    });


    doc.font('Helvetica').fontSize(12).fillColor(colors.gray700)
      .text(`Last Payment: ${invoice.lastPaymentDate ? new Date(invoice.lastPaymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}`, 50, tableTop + rowHeight * 2 + 10)
      .text(`Next Billing: ${invoice.nextBillingDate ? new Date(invoice.nextBillingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}`, 350, tableTop + rowHeight * 2 + 10);

    doc.moveTo(50, tableTop + rowHeight * 3 + 20).lineTo(545, tableTop + rowHeight * 3 + 20)
      .strokeColor(colors.gray300).stroke();


    doc.font('Helvetica-Oblique').fontSize(10).fillColor(colors.gray500)
      .text(`Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 50, 720, { align: 'center' })
      .text('Contact: support@taskmanager.com', 50, 735, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).redirect('/errorpage?message=Error generating invoice PDF&type=error');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
