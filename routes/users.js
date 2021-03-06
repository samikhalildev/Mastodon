var express = require("express");
var router = express.Router();
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var mongoose = require("mongoose");
var User = require("../models/user");
var config = require("../wdio.conf");
const nodemailer = require("nodemailer");
var bcrypt = require("bcryptjs");
var userVerification = require("./templates/userVerification");
//Creating  transporter for Mail Sending
let transporter = null;
// create reusable transporter object using the default SMTP transport
// GARY
nodemailer.createTestAccount((err, account) => {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other port
    auth: {
      user: "mastodonuts0@gmail.com", // generated ethereal user
      pass: "hrhk1234" // generated ethereal password
    }
  });
});

// GET Rregister page
router.get("/register", function(req, res) {
  res.render("register");
});

// GET login page
router.get("/login", function(req, res) {
  res.render("login");
});

// Register User
router.post("/register", function(req, res) {
  // Get the data from the register form
  var name = req.body.name;
  var email = req.body.email;
  var username = req.body.username;
  var password = req.body.password;
  var password2 = req.body.password2;
  var bio = req.body.bio;
  var specialty = req.body.specialty;

  // Validation
  req.checkBody("name", "Name is required").notEmpty();
  req.checkBody("email", "Email is required").notEmpty();
  req.checkBody("email", "Email is not valid").isEmail();
  req.checkBody("username", "Username is required").notEmpty();
  req.checkBody("password", "Password is required").notEmpty();
  req
    .checkBody("password2", "Passwords do not match ")
    .equals(req.body.password);
  // VALIDATION FOR PASSWORD GARY
  req
    .checkBody(
      "password",
      "Password must include one lowercase character, one uppercase character, a number, and a special character"
    )
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/, "i");
  var errors = req.validationErrors();

  if (errors) {
    res.render("register", {
      errors: errors
    });
  } else {
    //checking for email and username are already taken
    User.findOne(
      {
        username: {
          $regex: "^" + username + "\\b",
          $options: "i"
        }
      },
      function(err, user) {
        User.findOne(
          {
            email: {
              $regex: "^" + email + "\\b",
              $options: "i"
            }
          },
          function(err, mail) {
            if (user) {
              var errorString ="Username has already been taken";
              return res.render("register", {
                error: errorString
              });
            } if (mail) {
              var errorString ="Email has already been taken";
              return res.render("register", {
                error: errorString
              });
            }else {
              // Creates a new user object
              var newUser = new User({
                name: name,
                email: email,
                username: username,
                password: password,
                userType: "student",
                bio: bio,
                verificationCode: mongoose.Types.ObjectId(),
                specialty: specialty
              });
              User.createUser(newUser, function(err, user) {
                if (err) throw err;
                //  mail sending options GARY
                console.log("email is", email);
                var newLink = req.originalUrl + `/users/verify/${user.verificationCode}`;
                console.log("verification link is", newLink);
                let mailOptions = {
                  from: '"UTS University" <mastodonuts0@gmail.com>', // sender address
                  to: email, // list of receivers
                  subject: "Welcome to Mastadon", // Subject le
                  text: "Verification Link", // plain text body
                  // MAIL TEMPLATE

                  html: userVerification(
                    name,
                    `https://www.sawickers.com/users/verify/${
                      user.verificationCode
                    }`,
                    user.email
                  ) // html body
                };

                // send mail with defined transport object
                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    return console.log("errrrrrrrrrrrr", error);
                  }
                  console.log("Message sent: %s", info.messageId);
                  console.log(
                    "Preview URL: %s",
                    nodemailer.getTestMessageUrl(info)
                  );
                });
                req.flash(
                  "success_msg",
                  "You are registered and verification Link is send to registered e-mail"
                );
                res.redirect("/mastodon/users/login");
              });
            }
          }
        );
      }
    );
  }
});

passport.use(
  new LocalStrategy(function(username, password, done) {
    User.getUserByUsername(username, function(err, user) {
      // Throw error if username was incorrect
      if (err) throw err;
      if (!user) {
        return done(null, false, { message: "Unknown User" });
      }
      //GARY IF USER IS NOT VERIFIED AND TRY TO LOGIN
      if (!user.verificationStatus) {
        return done(null, false, { message: "User is not verified" });
      }
      User.comparePassword(password, user.password, function(err, isMatch) {
        // Throw error if password was not matched
        if (err) throw err;

        // If it matched, return the user
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: "Invalid password" });
        }
      });
    });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});
router.get("/registerSpecial/:code", (req, res) => {
  if (req.user) {
    return res.redirect("/mastodon/");
  }
  var verification = req.params.code;
  User.findOne({verificationCode : verification}, function (err, user) {
    if (user) {
      res.render("finishAccount", {userType: user.userType, userId: user._id});
    } else {
      res.render("finishAccount", {error: "Link has expired."});
    }
  })
})
router.post("/registerSpecial/confirm", (req, res) => {
  var name = req.body.name;
  var username = req.body.username;
  var password = req.body.password;
  var password2 = req.body.password2;
  var bio = req.body.bio;
  var specialty = req.body.specialty;
  var id = req.body.id;
  console.log("my post id is :"+id);

  // Validation
  req.checkBody("name", "Name is required").notEmpty();
  req.checkBody("password", "Password is required").notEmpty();
  req
    .checkBody("password2", "Passwords do not match ")
    .equals(req.body.password);
  req
    .checkBody(
      "password",
      "Password must include one lowercase character, one uppercase character, a number, and a special character"
    )
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/, "i");
  var errors = req.validationErrors();

  if (errors) {
    res.render("finishAccount", {
      errors: errors
    });
  } else {
    //Check if username already exists
    User.getUserByUsername(username, function(err, user) {
      if (user) {
        res.render("finishAccount", {errors: "You have already finalized your account"});
      } else {
        User.getUserById(id, function(err, user) {
          if (user) {
            bcrypt.genSalt(10, function(err, salt) {
              bcrypt.hash(password, salt, function(err, hash) {
                password = hash;
                var query = { $set: {
                  username: username, name: name, password: password, bio: bio, verificationCode: id, specialty: specialty, verificationStatus: true
                }}
                User.updateOne({_id : id}, query, function(err, user) {
                  if (user) {
                    console.log("success");
                    res.redirect("/mastodon/users/login");
                  } else {
                    console.log("could not find user");
                  }
                })

              });
            });
          } else {
            res.render("finishAccount", {errors: "Couldn't find an account with that ID"});
          }
        })
      }
    });
  }
});
//BUTTON IN EMAIL WILL CALL THIS ROUTE GARY
router.get("/verify/:code", (req, res) => {
  User.findOneAndUpdate(
    { verificationCode: req.params.code },
    {
      $set: {
        verificationStatus: true,
        verificationCode: mongoose.Types.ObjectId()
      }
    },
    {
      new: true
    }
  )
    .then(result => {
      console.log("the result is");
      if (!result) {
        return res.status(200).send("Link is expired");
      }

      res.redirect("/mastodon/users/login");
    })
    .catch(err => {
      reject(err);
    });
  // userController
  //   .update(
  //     { verificationCode: req.params.code },
  //     {
  //       $set: {
  //         verificationStatus: true,
  //         verificationCode: mongoose.Types.ObjectId()
  //       }
  //     }
  //   )
  //   .then(result => {
});
router.post("/mastodon/login",
  passport.authenticate("local", {
    successRedirect: "/mastodon/",
    failureRedirect: "/mastodon/users/login",
    failureFlash: true
  }),
  function(req, res) {
    res.status(200)
    res.redirect(200, "/mastodon/dashboard");
  }
);

router.get("/logout", function(req, res) {
  req.logout();

  req.flash("success_msg", "You are logged out");
  res.status(200);
  res.redirect("/mastodon/users/login");
});

module.exports = router;
