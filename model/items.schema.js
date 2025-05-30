import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema({
    itemName: String,
    price: String,
    img: [String],
    description: String,
    type: String,
    sold: {
        type: Number,
        default: 0 
    },
    remaining: {
        type: Number,
        default: 0 
    },
    evaluate: {
        type: Number,
        default: 0 
    },
}, {
    timestamps: true 
})

const itemModel = mongoose.model('items', itemSchema);

export default itemModel;