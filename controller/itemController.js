import itemModel from "../model/items.schema.js"
import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv';
dotenv.config();

const getCloudinaryConfig = JSON.parse(process.env.CLOUD_DINARY_CONFIG);
cloudinary.config(getCloudinaryConfig);


const itemController = {
    getAllItems: async (req, res) => {
        try {
            const {
                currentPage = 1,
                pageSize = 12,
                sortBy = 'price',
                sortType = '-1',
                searchValue = '',
                filterData = ''
            } = req.query;

            const skip = (parseInt(pageSize) || 12) * (parseInt(currentPage) - 1);
            const sortOrder = parseInt(sortType) || -1;

            // Build filter object
            let filter = {};
            if (searchValue) {
                // Tìm kiếm itemName chứa searchValue (không phân biệt hoa thường)
                filter.itemName = { $regex: searchValue, $options: 'i' };
            }
            if (filterData) {
                // Giả sử filterData dùng để lọc theo trường 'type'
                filter.type = filterData;
            }
            let sort = {};
            sort[sortBy] = sortOrder;

            const items = await itemModel.aggregate([
                {
                    $match: filter  // Áp dụng filter trước
                },
                {
                    $addFields: {
                        priceAsNumber: { $toDouble: "$price" }  // Chuyển đổi 'price' từ string thành number
                    }
                },
                {
                    $sort: {
                        priceAsNumber: sortOrder  // Sắp xếp theo price sau khi đã chuyển đổi thành number
                    }
                },
                {
                    $skip: skip  // Phân trang
                },
                {
                    $limit: parseInt(pageSize) || 12  // Giới hạn số lượng item
                }
            ]);

            const totalItems = await itemModel.countDocuments(filter);

            res.status(200).json({ items, totalItems });
        } catch (error) {
            console.error('Error fetching items:', error);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    },

    getItemById: async (req, res) => {
        const itemId = req.params.id;
        const rs = await itemModel.findById(itemId);
        res.status(200).send(rs)
    },

    postItem: async (req, res) => {
        const item = req.body;
        const rs = await itemModel.create(item);
        res.status(200).send(rs);
    },

    updateItem: async (req, res) => {
        let newItem = req.body;
        let item = req.params.id;
        let rs = await itemModel.findByIdAndUpdate(
            item,
            newItem
        )
        res.status(200).send(rs)
    },

    deleteItem: async (req, res) => {
        const rs = await itemModel.findByIdAndDelete(req.params.id);
        res.status(200).send(rs);

    },

    uploadImgItem: async (req, res) => {
        let imgs = req.files;
        let itemId = req.params.id;
        let item = await itemModel.findOne({ _id: itemId });

        if (item) {
            if (imgs && imgs.length > 0) {
                try {
                    const listResult = [];
                    for (let file of imgs) {
                        const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                        const fileName = file.originalname.split('.')[0];

                        const result = await cloudinary.uploader.upload(dataUrl, {
                            public_id: fileName,
                            resource_type: 'auto',
                        });

                        listResult.push(result.url);
                    }

                    let rss = await itemModel.findByIdAndUpdate({ _id: itemId }, { img: listResult });
                    return res.json({ message: 'Tệp được tải lên thành công.', rss });
                } catch (err) {
                    return res.status(500).json({ error: 'Lỗi khi upload hình ảnh.', err });
                }
            } else {
                return res.status(400).json({
                    message: 'Không có tệp được tải lên.'
                });
            }
        } else {
            return res.status(404).json({
                message: 'Item không tồn tại.'
            });
        }
    }

}

export default itemController;