import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userID: {
        type: mongoose.Types.ObjectId,
        ref: 'users',
        required: true
    },
    username: String,
    phoneNumber: String,
    address: String,
    orders: [{
        itemID: {
            type: mongoose.Types.ObjectId,
            ref: 'items'
        },
        quantity: {
            type: Number,
            default: 1
        }
    }],
    totalPrice: Number,
    status: String,
},
    {
        timestamps: true
    }
)

const orderModel = mongoose.model('orders', orderSchema);

export default orderModel;