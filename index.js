require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Logging MONGO_URI to verify it's loaded correctly
console.log('MONGO_URI:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  console.log('/api/users POST called with:', req.body);
  const { username } = req.body;
  const newUser = new User({ username });
  try {
    const savedUser = await newUser.save();
    console.log('User saved:', savedUser);
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    console.error('Failed to create user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.get('/api/users', async (req, res) => {
  console.log('/api/users GET called');
  try {
    const users = await User.find({}, 'username _id');
    console.log('Users found:', users);
    res.json(users);
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  console.log('/api/users/:_id/exercises POST called with:', req.params, req.body);
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  const exerciseDate = date ? new Date(date) : new Date();

  const newExercise = new Exercise({
    userId: _id,
    description,
    duration: parseInt(duration),
    date: exerciseDate
  });

  try {
    const savedExercise = await newExercise.save();
    const user = await User.findById(_id);
    if (!user) {
      console.error('User not found:', _id);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('Exercise saved:', savedExercise, 'for user:', user);
    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    console.error('Failed to add exercise:', err);
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  console.log('/api/users/:_id/logs GET called with:', req.params, req.query);
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  let dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);

  try {
    const user = await User.findById(_id);
    if (!user) {
      console.error('User not found:', _id);
      return res.status(404).json({ error: 'User not found' });
    }

    let exercisesQuery = { userId: _id };
    if (dateFilter.$gte || dateFilter.$lte) {
      exercisesQuery.date = dateFilter;
    }

    let exercises = await Exercise.find(exercisesQuery)
                                  .limit(parseInt(limit) || 0);

    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    console.log('Logs found for user:', user, 'log:', log);
    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: log
    });
  } catch (err) {
    console.error('Failed to fetch exercise logs:', err);
    res.status(500).json({ error: 'Failed to fetch exercise logs' });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
