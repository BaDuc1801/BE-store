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

            await userModel.updateOne(
                { _id: userID },
                {
                    $pull: {
                        cart: {
                            itemID: { $in: orderedItemIDs }
                        }
                    }
                }
            );

            const updatedUser = await userModel.findById(userID).populate('cart.itemID');

            return res.status(200).json(updatedUser);

        } catch (error) {
            console.error("Order failed:", error);
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