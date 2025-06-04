import orderModel from "../model/orders.schema";

const orderController = {
    postOrder: async (req, res) => {
        const userID = req.user.userId;
        const data = req.body;
        const rs = await orderModel.create({
            ...data,
            status: 'pending',
            userID: userID,
        })
        return res.status(200).send(rs)
    },

    getOrderByUserID: async (req, res) => {
        const userID = req.user.userId;
        const rs = await orderModel.find({
            userID: userID
        })
        return res.status(200).send(rs)
    }
}

export default orderController;