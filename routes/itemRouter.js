import express from 'express'
import itemController from '../controller/itemController.js';
import multer from 'multer';

const itemRouter = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage
})
itemRouter.get('/', itemController.getAllItems);
itemRouter.post('/', itemController.postItem);
itemRouter.put('/update-item-img/:id', upload.array('img'), itemController.uploadImgItem);
itemRouter.put('/update-item/:id', itemController.updateItem);
itemRouter.delete('/delete-item/:id', itemController.deleteItem);

export default itemRouter