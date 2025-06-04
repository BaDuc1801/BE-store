import orderModel from "../model/orders.schema.js";
import userModel from "../model/user.schema.js";

const orderController = {
    postOrder: async (req, res) => {
        try {
            const userID = req.user.userId;
            const data = req.body;

            await orderModel.create({
                ...data,
                status: 'pending',
                userID: userID,
            });

            const orderedItemIDs = data.orders.map(order => order.itemID);

            const user = await userModel.updateOne(
                { _id: userID },
                {
                    $pull: {
                        cart: {
                            itemID: { $in: orderedItemIDs }
                        }
                    }
                },
                {
                    new: true
                }
            );

            return res.status(200).send(user);
        } catch (error) {
            return res.status(500).send({ message: 'Order failed', error });
        }
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