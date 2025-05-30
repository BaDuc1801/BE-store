import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: String,
    avatar: String,
    phone: String,
    address: String,
    place: String,
    email: {
        require: true,
        type: String
    },
    password: {
        require: true,
        type: String
    },
    favourites: [{
        type: mongoose.Types.ObjectId,
        ref: 'items'
    }],
    cart: [{
        type: mongoose.Types.ObjectId,
        ref: 'items'
    }],
    role: {
        type: String,
        default: "client"
    }
})

const userModel = mongoose.model('users', userSchema);

export default userModel;