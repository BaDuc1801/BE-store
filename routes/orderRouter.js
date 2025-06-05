import express from 'express'
import userMiddleware from '../middleware/userMiddleware.js';
import orderController from '../controller/orderController.js';

const orderRouter = express.Router();

orderRouter.post('/', userMiddleware.verifyToken, orderController.postOrder);
orderRouter.get('/', userMiddleware.verifyToken, orderController.getOrderByUserID);
orderRouter.get('/get-by-status', userMiddleware.verifyToken, orderController.findOrderByStatus)

export default orderRouter
