import express from 'express'
import userMiddleware from '../middleware/userMiddleware';
import orderController from '../controller/orderController';

const orderRouter = express.Router();

orderRouter.post('/', userMiddleware.verifyToken, orderController.postOrder);
orderRouter.get('/', userMiddleware.verifyToken, orderController.getOrderByUserID);

export default orderRouter
