const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
require('dotenv').config()

app.use(cors({optionsSuccessStatus: 200}));

app.use(express.static('public'))
app.use(express.urlencoded({extended:true}))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true, useUnifiedTopology: true
})

const userExerciseSchema = new mongoose.Schema({
  user: String,
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
});

const userExercise = mongoose.model('userExercise', userExerciseSchema);

app.post('/api/users', (req, res) => {
  let username = req.body.username;
  userExercise.findOne({ user: username}, (err, result) => {
    if (err) return console.error(err);
    if (!result) {
      userExercise.create({ user: username }, (err, result) => {
        if (err) return console.error(err);
        const {user:username,_id} = result
        res.status(200).json({username,_id});
      });
    } else {
      res.json ('Username is taken');
    }
  });
});

app.get('/api/users', (req, res) => {
  userExercise.find({}, (err, result) => {
    if (err) return console.error(err);
    let users = []
    result.forEach(item => users.push({username:item.user,_id:item['_id']}))
    res.status(200).json(users);
  });
})


app.post('/api/users/:_id/exercises', (req, res) => {
  const {_id} = req.params;
  const {description, duration} = req.body;
  if (req.body.date === '' || req.body.date === undefined) {
    date = new Date().toDateString()
  } else {
    date = new Date(req.body.date).toDateString();
  }
  let newExercise = {description, duration:parseInt(duration),date}

  userExercise.findOneAndUpdate(
    {_id:_id},
    { $push: {log:newExercise} },
    {returnOrginal:false, useFindAndModify:false},
    (err, result) => {
      if (err) return console.error(err);
      res.json({username:result.user, description,duration:parseInt(duration), date, _id:result._id})
    }
  );
})



app.get('/api/users/:_id/logs', (req, res) => {
  let {_id} = req.params;
  let {from,to,limit} = req.query;
  userExercise.findById(_id, (err, result) => {
    if (err) return console.error(err);
    let filteredExercise = result.log;
    if (from) filteredExercise = filteredExercise.filter(e => new Date(e.date) > new Date(from) );
    if (to) filteredExercise = filteredExercise.filter(e => new Date(e.date) < new Date(to) );

    if (parseInt(limit) > 0) {
      filteredExercise = filteredExercise.slice(0, parseInt(limit));
    }
    let logs = []
    filteredExercise.forEach(item => {
      const {description,duration,date} = item
      logs.push({description,duration,date,})
    })
    res.json({username:result.user, count:filteredExercise.length,
    _id:result._id, 
    log:logs});
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
