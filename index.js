import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import itemRouter from './routes/itemRouter.js';
import userRouter from './routes/userRouter.js';
import cookieParser from 'cookie-parser';
import orderRouter from './routes/orderRouter.js';

await mongoose.connect('mongodb+srv://minhduc180104:minhduc180104@learnmongo.zli6q.mongodb.net/store?retryWrites=true&w=majority&appName=LearnMongo')

const corsOptions = {
    origin: 'http://localhost:5173',  
    methods: ['GET', 'POST', 'PUT', 'DELETE'],  
    credentials: true, 
};

const app = express();
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());

app.use('/items', itemRouter)
app.use('/users', userRouter)
app.use('/orders', orderRouter)

app.get("/", (req, res) => {
    res.status(200).json({ message: "hello!" });
});

app.listen(8080, () => {
    console.log("Server is running")
})