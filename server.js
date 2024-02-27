const axios = require('axios');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const fs = require('fs');
const connectDB = require('./database'); // Import the connectDB function
const bcrypt = require('bcryptjs');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // make sure this uploads directory exists
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: multer.memoryStorage() });
const User = require('./models/User');
const BlogPost = require('./models/BlogPost');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1111';

// const ADMIN_USERNAME = process.env.ADMIN_USERNAME || db.users.find({}, { "username": 1, "_id": 0 });
// const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ||  db.users.find({}, { "password": 1, "_id": 0 });
const img_url = "https://image.tmdb.org/t/p/w500";
// Configure dotenv
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
app.use(express.json());
app.use(session({
    secret: 'your secret key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: !true }
  }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
let initial_path = path.join(__dirname, "public");
app.use(express.urlencoded({ extended: true }));

// Middleware to set default language or change it
app.use((req, res, next) => {
    if (req.query.lang) {
        req.session.language = req.query.lang;
    } else if (!req.session.language) {
        req.session.language = 'en'; // Default language is English
    }

    res.locals.language = req.session.language; // Make language available in all views
    res.locals.translations = dictionary[req.session.language]; // Make translations available in all views
    next();
});

// Home route
app.get('/', (req, res) => {
    const language = req.session.language || 'en-US';
    const isAdmin = req.session.user ? req.session.user.isAdmin : false;
    const loggedIn = req.session.user ? true : false;

    res.render('index', {
        title: 'Homepage',
        loggedIn: loggedIn,
        language: language,
        isAdmin: isAdmin
    });
});

const dictionary = {
    'en': {
        signIn: 'Sign in',
        joinNow: 'Join now',
        joinMessage: 'UNLIMITED TV SHOWS & MOVIES',
        info: 'Movies move us like nothing else can, whether they are scary, funny, dramatic, romantic or anywhere in-between. So many titles, so much to experience.',
        aboutTitle: 'We are more than just a movie hub',
        aboutContent: 'Discover a world of cinematic wonders, from heartwarming tales to adrenaline-pumping adventures. Dive into stories that transcend time and space, crafted to move and inspire you.',
        netflixTeam: 'We are The Netflix Team',
        pleaseLogin: 'Please login to your account',
        username: 'Username',
        password: 'Password',
        login: 'Login',
        forgot_pass: 'Forgot Password?',
        dontHaveAcc: 'Do not have an account?',
        createNew: 'Create New',
        confirmPassword: 'Confirm Password',
        register: 'Register',
        logout: 'Logout',
        alreadyHaveAcc: 'Already Have an Account?',
        firstname: 'Firstname',
        lastname: 'Lastname',
        recommend: 'More Like This',
        starring: 'Starring',
        cast: 'Cast information not available.',
        admin: 'Admin',
        admin_dashboard: 'Admin Dashboard',
        edit: 'Edit',
        delete: 'Delete',
        add_new_user: 'Add New User',
        cancel: 'Cancel',
        blog: 'Blog',
        add_post: 'Add Post',
        marvelfan: 'Marvel Fan',
    },
    'ru': {
        signIn: 'Войти',
        joinNow: 'Регистрация',
        joinMessage: 'НЕОГРАНИЧЕННЫЕ ТВ-ШОУ И ФИЛЬМЫ',
        info: 'Фильмы трогают нас так, как ничто другое, будь то страшные, смешные, драматические, романтические или что-то среднее между ними. Так много титулов, так много опыта.',
        aboutTitle: 'Мы - не просто кинопортал',
        aboutContent: 'Откройте для себя мир кинематографических чудес, от сердечных историй до захватывающих приключений. Погрузитесь в истории, которые преодолевают время и пространство, созданные, чтобы тронуть и вдохновить вас.',
        netflixTeam: 'Мы команда Netflix',
        pleaseLogin: 'Пожалуйста зайдите на свой аккаунт',
        username: 'Ник',
        password: 'Пароль',
        login: 'Логин',
        forgot_pass: 'Забыли Пароль?',
        dontHaveAcc: 'Нету аккаунта?',
        createNew: 'Создать Новый',
        confirmPassword: 'Подтвердите пароль',
        register: 'Регистрация',
        logout: 'Выйти',
        alreadyHaveAcc: 'Уже есть аккаунт?',
        firstname: 'Имя',
        lastname: 'Фамилия',
        recommend: 'Больше подобного',
        starring: 'В главных ролях',
        cast: 'Информация о составе недоступна.',
        admin: 'Админ',
        admin_dashboard: 'Админ Панель',
        edit: 'Редактировать',
        delete: 'Удалить',
        add_new_user: 'Добавить нового пользователя',
        cancel: 'Отмена',
        blog: 'Блог',
        add_post: 'Добавить  Пост',
        marvelfan: 'Фанаты Марвел',
    }
};

// Route for login page
app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/blog', ensureAuthenticated, async (req, res) => {
    const isAdmin = req.session.user ? req.session.user.isAdmin : false;
    const loggedIn = !!req.session.user;
    const posts = await BlogPost.find();

    res.render('blog', { isAdmin : isAdmin, loggedIn : loggedIn, posts: posts });
})

app.get('/addPost', ensureAuthenticated, async (req, res) => {
    const isAdmin = req.session.user ? req.session.user.isAdmin : false;
    const loggedIn = !!req.session.user;
    const posts = await BlogPost.find();

    res.render('addPost', { isAdmin : isAdmin, loggedIn : loggedIn, posts: posts });
})

// Route for registration page
app.get('/registration', (req, res) => {
    res.render('registration', { title: 'Registration' });
});

// Route for specific movie pages
app.get('/movie/:id', ensureAuthenticated, async (req, res) => {
    try {
        const isAdmin = req.session.user.isAdmin ? true : false;
        const loggedIn = req.session.user ? true : false;
        const language = req.session.language || 'en-US';
        const movieId = req.params.id;

        const genres = await fetchGenres();
        const movieDetails = await fetchMovieDetails(movieId, language);
        const videos = await fetchMovieVideos(movieId);
        const recommendations = await fetchMovieRecommendations(movieId);
        
        // Log the data for debugging
        console.log("CHECK HERE");
        console.log("Videos:", videos);
        console.log("WOW RECO");
        console.log("Recommendations:", recommendations);
        
        res.render('about', {
            genres: genres,
            loggedIn: loggedIn,
            movie_id: movieId,
            movieImage: `https://image.tmdb.org/t/p/original${movieDetails.poster_path}`,
            movieDetails: movieDetails || {},
            videos: videos || [],
            recommendations: recommendations || [],
            img_url: img_url,
            language: language,
            isAdmin: isAdmin
        });
    } catch (error) {
        console.error('Error fetching movie details:', error);
        res.status(500).send('Error fetching movie details');
    }
});

const fetchMovieDetails = async (movieId, language = 'en') => {
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.MOVIE_DB_API_KEY}&language=${language}&append_to_response=credits`);
        const data = response.data;

        const movieDetailsWithCast = {
            ...data,
            cast: data.credits.cast
        };

        return movieDetailsWithCast;
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
};

const fetchGenres = async (page) => {
    try {
      let result;
      await axios
        .get(
          `https://api.themoviedb.org/3/genre/movie/list?api_key=${process.env.API_KEY}`
        )
        .then((response) => {   
          result = response.data.genres;
        })
        .catch((error) => {
          console.log(error);
        });
      return result;
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMovieVideos = async (movieId) => {
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${process.env.MOVIE_DB_API_KEY}`);
        return response.data.results; // Return the array of videos
    } catch (error) {
        console.error('Error fetching movie videos:', error);
        return [];
    }
};

const fetchMovieRecommendations = async (movieId) => {
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${process.env.MOVIE_DB_API_KEY}`);
        return response.data.results; // Return the array of recommendations
    } catch (error) {
        console.error('Error fetching movie recommendations:', error);
        return [];
    }
};

app.get('/marvel', ensureAuthenticated, async (req, res) => {
    try {
        const url = generateMarvelApiUrl('characters');
        const response = await axios.get(url);
        const characters = response.data.data.results;
        const isAdmin = req.session.user.isAdmin ? true : false;
        const loggedIn = req.session.user ? true : false;

        res.render('marvel', { characters, isAdmin, loggedIn });
    } catch (error) {
        console.error('Error fetching Marvel characters:', error);
        res.status(500).send('Error fetching data');
    }
});


// Function to generate Marvel API URL
const generateMarvelApiUrl = (endpoint, query = '') => {
    const publicKey = 'b53546fc8882e95651722cb4989f4e3d';
    const ts = 1; // For simplicity in this example, use a static timestamp
    const hash = 'e0f0a399bedbfc164c90538b800a98f4'; // This should be dynamically generated in production
    return `http://gateway.marvel.com/v1/public/${endpoint}?${query}&ts=${ts}&apikey=${publicKey}&hash=${hash}`;
};

app.get('/marvel-characters', async (req, res) => {
    try {
        const url = generateMarvelApiUrl('characters');
        const response = await axios.get(url);
        const characters = response.data.data.results;
        res.render('marvel-characters', { characters }); // Render EJS template with characters
    } catch (error) {
        console.error('Error fetching Marvel characters:', error);
        res.status(500).send('Error fetching data');
    }
});

// Route for setting language
app.get('/set-language', (req, res) => {
    const { lang } = req.query;
    if (lang) {
        req.session.language = lang;
    }
    res.redirect(req.headers.referer || '/');
});

app.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, username, password } = req.body;
        const role = 'User'
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send('Username already exists');
        }
  
      // Create a new user and save to the database
      const user = new User({ firstName, lastName, username, password, role });
      await user.save();
      console.log("Successfully created a user!");

      // Redirect user to the login page after successful registration
      res.redirect('/login');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error registering new user');
    }
  });

app.post('/login', async (req, res) => {
    console.log("Login attempt for user:", req.body.username);
    const { username, password } = req.body;

    // Check for admin credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.user = { username, isAdmin: true };
        return res.redirect('/admin');
    }

    // Check for regular user credentials
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { username, isAdmin: !!user.isAdmin }; // Ensure isAdmin is correctly set based on user object
        return res.redirect('/');
    }

    res.render('login', { message: 'Invalid username or password' });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error while logging out:', err);
            res.status(500).send('Error logging out');
        } else {
            res.redirect('/login');
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});

function ensureAuthenticated(req, res, next) {
    // Check if the user session exists, indicating that the user is logged in
    if (req.session.user) {
        return next();
    }

    // If the session does not exist (user not logged in), redirect to the login page
    res.redirect('/login');
}

app.get('/admin', isAdmin, async (req, res) => {
    try {
        const users = await User.find();
        const isAdmin = req.session.user.isAdmin ? true : false;
        const loggedIn = req.session.user ? true : false;

        res.render('admin', { users: users, isAdmin : isAdmin, loggedIn : loggedIn });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error loading admin page');
    }
});

app.post('/admin/adduser', isAdmin, async (req, res) => {
    const { username, password, firstName, lastName } = req.body;
    const role = 'User';
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send('Username already exists');
        }
  
        const user = new User({
          firstName,
          lastName,
          username,
          role,
          password,
        });
    
        await user.save();
        // Testing email sending
      sendEmail('fokonoe88@gmail.com', 'Test Subject', 'Added new user');
        res.redirect('/admin');
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send('Server error');
    }
});

app.post('/admin/edituser/:userId', isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { username /* other fields */ } = req.body;
  
      await User.findByIdAndUpdate(userId, { username /* other fields */ });
  
      res.redirect('/admin');
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).send('Error updating user');
    }
});  
  
app.post('/admin/deleteuser/:userId', isAdmin, async (req, res) => {
    await User.findByIdAndDelete(req.params.userId);
    res.redirect('/admin');
});

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    } else {
        return res.status(403).send('Access Denied');
    }
}

app.post('/admin/add-post', ensureAuthenticated, upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
  ]), async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
      return res.status(403).send('Unauthorized');
    }
  
    const { name_en, name_ru, description_en, description_ru } = req.body;
  
    // Create a new post with the text and image data
    const newPostData = {
        name_en,
        name_ru,
        description_en,
        description_ru,
        image1: {
            data: req.files['image1'][0].buffer,
            contentType: req.files['image1'][0].mimetype
        },
        image2: {
            data: req.files['image2'][0].buffer,
            contentType: req.files['image2'][0].mimetype
        },
        image3: {
            data: req.files['image3'][0].buffer,
            contentType: req.files['image3'][0].mimetype
        }
    };
  
    try {
      const newPost = new BlogPost(newPostData);
      // Testing email sending
      sendEmail('fokonoe88@gmail.com', 'Test Subject', 'Added new post');
      await newPost.save();
      res.redirect('/blog');
    } catch (error) {
      console.error('Error saving the post:', error);
      res.status(500).send('Error saving the post');
    }
});  

app.get('/images/:postId/:imageField', async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.postId);
        if (!post || !post[req.params.imageField].data) {
            return res.status(404).send('Not found');
        }
        const img = post[req.params.imageField];
        res.contentType(img.contentType);
        res.send(img.data);
    } catch (error) {
        res.status(404).send('Not found');
    }
});
app.post('/admin/delete-post/:postId', ensureAuthenticated, async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).send('Unauthorized');
    }

    try {
        await BlogPost.findByIdAndDelete(req.params.postId);
        // Testing email sending
      sendEmail('fokonoe88@gmail.com', 'Test Subject', 'Removed a post');
        res.redirect('/blog');
    } catch (error) {
        console.error('Error deleting the post:', error);
        res.status(500).send('Error deleting the post');
    }
});




// Importing Nodemailer
const nodemailer = require('nodemailer');

// Basic email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'zhailaybaimiras05@gmail.com', // Your email
        pass: 'ffto rllv uevp labj' // Your password
    }
});

// Function to send email
const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: 'zhailaybaimiras05@gmail.com',
            to: to,
            subject: subject,
            text: text
        });
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// const axios = require('axios');

// Route to fetch Chuck Norris joke
app.get('/chuck-norris-joke', async (req, res) => {
    try {
        const response = await axios.get('https://api.chucknorris.io/jokes/random');
        const joke = response.data.value;
        res.send(joke);
    } catch (error) {
        console.error('Error fetching Chuck Norris joke:', error);
        res.status(500).send('Error fetching Chuck Norris joke');
    }
});
