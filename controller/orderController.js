import orderModel from "../model/orders.schema.js";
import userModel from "../model/user.schema.js";

const orderController = {
    postOrder: async (req, res) => {
    try {
        const userID = req.user.userId;
        const data = req.body;

        // 1. Tạo đơn hàng mới
        await orderModel.create({
            ...data,
            status: 'pending',
            userID: userID,
        });

        // 2. Lấy danh sách itemID đã được đặt hàng
        const orderedItemIDs = data.orders.map(order => order.itemID);

        // 3. Cập nhật giỏ hàng người dùng: loại bỏ các item đã đặt
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

        // 4. Truy vấn lại user đã được cập nhật (bao gồm cart mới)
        const updatedUser = await userModel.findById(userID).populate('cart.itemID');

        return res.status(200).json({
            message: 'Order successfully placed',
            user: updatedUser
        });

    } catch (error) {
        console.error("Order failed:", error);
        return res.status(500).send({ message: 'Order failed', error });
    }
};


    getOrderByUserID: async (req, res) => {
        const userID = req.user.userId;
        const rs = await orderModel.find({
            userID: userID
        })
        return res.status(200).send(rs)
    }
}

export default orderController;