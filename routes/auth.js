var express = require('express')
var router = express.Router()
var template = {
    HTML:function(title, list, body, control, authStatusUI='<a href="/auth/login">login</a>'){
      return `
      <!doctype html>
      <html>
      <head>
        <title>WEB1 - ${title}</title>
        <meta charset="utf-8">
      </head>
      <body>
        ${authStatusUI}
        <h1><a href="/">WEB(passport)</a></h1>
        ${list}
        ${control}
        ${body}
      </body>
      </html>
      `;
    },list:function(filelist){
      var list = '<ul>';
      var i = 0;
      while(i < filelist.length){
        list = list + `<li><a href="/topic/${filelist[i].id}">${filelist[i].title}</a></li>`;
        i = i + 1;
      }
      list = list+'</ul>';
      return list;
    }
  }
var auth = require('../lib/auth')
var shortid = require('shortid');
var db = require('../lib/db')
var bcrypt = require('bcryptjs');

module.exports = function (passport) {
  router.get('/login', function (request, response) {
    var fmsg = request.flash();
    var feedback = '';
    if (fmsg.error) {
      feedback = fmsg.error[0];
    }

    var title = 'WEB - login';
    var list = template.list(request.list);
    var html = template.HTML(title, list, `
  <div style="color:red;">${feedback}</div>
  <form action="/auth/login_process" method="post">
  <p><input type="text" name="email" placeholder="email" value="test@gmail.com"></p>
  <p><input type="password" name="pwd" placeholder="password" value="111111"></p>
  <p>
  <input type="submit" value="login">
  </p>
  </form>
  `, '' ,auth.statusUI(request, response));
    response.send(html);
  })


router.post('/login_process',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true,
    successFlash: true
  }));

router.get('/register', function (request, response) {
  var fmsg = request.flash();
  var feedback = '';
  if (fmsg.error) {
    feedback = fmsg.error[0];
  }

  var title = 'user register';
  var list = template.list(request.list);
  var html = template.HTML(title, list, `
<div style="color:red;">${feedback}</div>
<form action="/auth/register_process" method="post">
<p><input type="text" name="email" placeholder="email" value="test2@gmail.com"></p>
<p><input type="password" name="pwd" placeholder="password" value="111111"></p>
<p><input type="password" name="pwd2" placeholder="password" value="111111"></p>
<p><input type="text" name="displayName" placeholder="display name" value="tester2"></p>
<p><input type="submit" value="register"></p>
</form>
`, '');
  response.send(html);
})

router.post('/register_process', function (request, response) {
  // todo : validation
  // check email duplicaation check
  // check if pwd,pwd2 are same
  var post = request.body;
  var email = post.email;
  var pwd = post.pwd;
  var pwd2 = post.pwd2;
  var displayName = post.displayName;
  if(pwd !== pwd2){
    request.flash('error','password must same!');
    response.redirect('/auth/register');
  }else{
    bcrypt.hash(pwd, 10, function(err, hash) {
      console.log('hash',hash);
      var user = {
        id:shortid.generate(),
        email:email,
        password:hash,
        displayName:displayName
      }
        db.get('users').push(user).write();
        request.login(user, function(err){
          console.log('redirect');
          return response.redirect('/');
        })
  });


    }
});

router.get('/logout', function (request, response) {
  request.logout();
  response.redirect('/');
})

  return router;
}